// Safe Web Speech API and AudioContext wrapper for STT (Speech-to-Text) and TTS (Text-to-Speech)

export class SpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private audioCtx: AudioContext | null = null;
  private audioBlocked: boolean = false;

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
          try {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-IN'; // Indian English default
          } catch (initErr) {
            console.warn('SpeechRecognition instance creation failed:', initErr);
            this.recognition = null;
          }
        }
      }
    } catch (e) {
      console.warn('SpeechService initialization check skipped:', e);
    }
  }

  public isSpeechSupported(): boolean {
    try {
      return typeof window !== 'undefined' && 'speechSynthesis' in window && !!window.speechSynthesis;
    } catch {
      return false;
    }
  }

  public isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  // Play auditory tone feedback for kiosk interactions with fallback protection
  public playFeedbackTone(type: 'start' | 'stop' | 'success' | 'sign_detected') {
    if (this.audioBlocked) return;

    try {
      if (typeof window === 'undefined') return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {
          // Handled silently if autoplay restricted
        });
      }

      if (this.audioCtx.state === 'closed') return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'sign_detected') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.0, now + 0.1); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      // AudioContext may be restricted by browser policy before first click
      this.audioBlocked = false;
    }
  }

  // Speak out text loudly and clearly
  public speak(
    text: string,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): SpeechSynthesisUtterance | null {
    if (!this.isSpeechSupported() || !text) {
      if (onEnd) onEnd();
      return null;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const indianVoice = voices.find(v => v.lang && v.lang.includes('en-IN'));
          const naturalVoice = voices.find(v => v.lang && v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural')));
          if (indianVoice) {
            utterance.voice = indianVoice;
          } else if (naturalVoice) {
            utterance.voice = naturalVoice;
          }
        }
      } catch (voiceErr) {
        // Fallback to default voice
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = (e) => {
        console.warn('TTS playback error (non-fatal):', e);
        if (onError) onError(e);
      };

      window.speechSynthesis.speak(utterance);
      return utterance;
    } catch (e) {
      console.warn('Speech synthesis call failed:', e);
      if (onEnd) onEnd();
      return null;
    }
  }

  public stopSpeaking(): void {
    try {
      if (this.isSpeechSupported()) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore
    }
  }

  // Listen to microphone safely
  public startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError?: (err: any) => void
  ): boolean {
    if (!this.recognition) {
      if (onError) onError(new Error('Speech recognition not supported in this browser. Fallback text input is available.'));
      return false;
    }

    if (this.isListening) return true;

    try {
      this.playFeedbackTone('start');
      this.isListening = true;

      this.recognition.onresult = (event: any) => {
        try {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const text = final || interim;
          onResult(text, !!final);
        } catch (resErr) {
          console.warn('Speech recognition result parsing error:', resErr);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event?.error);
        this.isListening = false;
        if (onError) onError(event);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.playFeedbackTone('stop');
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e);
      return false;
    }
  }

  public stopListening(): void {
    try {
      if (this.recognition && this.isListening) {
        try {
          this.recognition.stop();
        } catch {
          // already stopped
        }
        this.isListening = false;
        this.playFeedbackTone('stop');
      }
    } catch (e) {
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechService();
