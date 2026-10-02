import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, Sparkles, RefreshCw, Eye, MessageSquare, Layers } from 'lucide-react';
import { handTracker } from '../services/handTracker';
import { corpusManager } from '../services/corpusMatcher';
import { speechService } from '../services/speechService';
import { SignAvatar } from './SignAvatar';
import { ConversationTurn, HandFrame, LiveRecognitionMatch } from '../types/isl';

interface KioskOverlayViewProps {
  onAddTurn: (turn: ConversationTurn) => void;
  onSwitchToSplit: () => void;
}

export const KioskOverlayView: React.FC<KioskOverlayViewProps> = ({
  onAddTurn,
  onSwitchToSplit,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isHoldingSign, setIsHoldingSign] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [activeMatch, setActiveMatch] = useState<LiveRecognitionMatch | null>(null);
  const [activeGlosses, setActiveGlosses] = useState<string[]>([]);
  const [interimVoice, setInterimVoice] = useState<string>('');
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('Press HOLD TO SIGN or HOLD TO SPEAK to start');
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>([]);
  const [avatarExpression, setAvatarExpression] = useState<string>('NEUTRAL');

  const frameBufferRef = useRef<HandFrame[]>([]);

  // Setup video stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    async function init() {
      try {
        await handTracker.initialize();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.warn('Webcam in overlay mode error:', e);
      }
    }

    init();

    const loop = (now: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          let detected: HandFrame[] = [];
          if (video && video.readyState >= 2) {
            detected = handTracker.detectHands(video, now);
          }

          detected.forEach(hf => {
            handTracker.drawLandmarks(ctx, hf.landmarks, canvas.width, canvas.height, '#c084fc', hf.handedness);
          });

          if (detected.length > 0 && isHoldingSign) {
            frameBufferRef.current.push(detected[0]);
            if (frameBufferRef.current.length > 25) frameBufferRef.current.shift();

            const match = corpusManager.recognizeSequence(frameBufferRef.current);
            if (match && match.confidence >= 0.65) {
              setActiveMatch(match);
              setActiveGlosses(prev => {
                if (prev[prev.length - 1] !== match.label) {
                  speechService.playFeedbackTone('sign_detected');
                  return [...prev, match.label];
                }
                return prev;
              });
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isHoldingSign]);

  // Handle Sign translation
  const handleSignEnd = async () => {
    speechService.playFeedbackTone('stop');
    setIsHoldingSign(false);

    if (activeGlosses.length > 0) {
      try {
        const res = await fetch('/api/gloss-to-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ glosses: activeGlosses }),
        });
        const data = await res.json();
        const sentence = data.sentence || activeGlosses.join(' ');
        setLastAnnouncement(sentence);
        speechService.speak(sentence);

        onAddTurn({
          id: `turn-${Date.now()}`,
          sender: 'deaf_signer',
          timestamp: Date.now(),
          rawInput: activeGlosses.join(' • '),
          aiOutput: sentence,
          confidence: activeMatch?.confidence || 0.88,
        });
      } catch (e) {
        const fallback = activeGlosses.join(' ');
        setLastAnnouncement(fallback);
        speechService.speak(fallback);
      } finally {
        setActiveGlosses([]);
        setActiveMatch(null);
        frameBufferRef.current = [];
      }
    }
  };

  // Handle Voice translation
  const handleVoiceStart = () => {
    setInterimVoice('');
    const ok = speechService.startListening((text, isFinal) => {
      setInterimVoice(text);
      if (isFinal) {
        handleVoiceFinalize(text);
      }
    });
    if (ok) setIsRecordingVoice(true);
  };

  const handleVoiceEnd = () => {
    speechService.stopListening();
    setIsRecordingVoice(false);
    if (interimVoice.trim()) {
      handleVoiceFinalize(interimVoice);
    }
  };

  const handleVoiceFinalize = async (text: string) => {
    try {
      const res = await fetch('/api/speech-to-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: text }),
      });
      const data = await res.json();
      const glosses = data.glosses || ['HELLO'];
      const expression = data.expression || 'NEUTRAL';

      setAvatarGlosses(glosses);
      setAvatarExpression(expression);
      setLastAnnouncement(`Spoken: "${text}" → ISL: ${glosses.join(' ')}`);

      onAddTurn({
        id: `turn-${Date.now()}`,
        sender: 'hearing_speaker',
        timestamp: Date.now(),
        rawInput: text,
        aiOutput: glosses.join(' • '),
        expression,
      });
    } catch (e) {
      setAvatarGlosses(['HELLO']);
    } finally {
      setInterimVoice('');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[640px] bg-black overflow-hidden rounded-2xl border border-purple-900/50 shadow-2xl">
      {/* Full viewport video feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-70"
      />
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full object-cover z-10"
      />

      {/* Top Floating HUD */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
        {/* Left: Live Translation Announcement Card */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-purple-500/60 rounded-2xl p-4 max-w-xl shadow-2xl pointer-events-auto">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-purple-400 uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Kiosk Live Broadcast HUD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            "{lastAnnouncement}"
          </h2>
          {activeGlosses.length > 0 && (
            <div className="mt-2 flex items-center space-x-1.5 overflow-x-auto">
              {activeGlosses.map((g, idx) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-purple-900 text-purple-200 font-mono font-bold text-xs">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Floating Sign Avatar PIP (Picture in Picture) */}
        <div className="w-64 h-56 rounded-2xl overflow-hidden border-2 border-indigo-500/80 shadow-2xl pointer-events-auto bg-slate-950/90 backdrop-blur-md">
          <SignAvatar
            glossSequence={avatarGlosses}
            expression={avatarExpression}
            isAnimating={avatarGlosses.length > 0}
          />
        </div>
      </div>

      {/* Active Recording Aura Overlay */}
      {isHoldingSign && (
        <div className="absolute inset-0 pointer-events-none z-20 border-8 border-purple-600/70 shadow-[inset_0_0_80px_rgba(168,85,247,0.5)] animate-pulse" />
      )}
      {isRecordingVoice && (
        <div className="absolute inset-0 pointer-events-none z-20 border-8 border-cyan-500/70 shadow-[inset_0_0_80px_rgba(6,182,212,0.5)] animate-pulse" />
      )}

      {/* Bottom Kiosk Giant Two-Button Dock */}
      <div className="absolute bottom-6 left-4 right-4 z-30 flex items-center justify-center">
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-700 p-3 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 max-w-3xl w-full">
          {/* Button 1: HOLD TO SIGN (Deaf User) */}
          <button
            onMouseDown={() => {
              speechService.playFeedbackTone('start');
              setIsHoldingSign(true);
            }}
            onMouseUp={handleSignEnd}
            onTouchStart={() => {
              speechService.playFeedbackTone('start');
              setIsHoldingSign(true);
            }}
            onTouchEnd={handleSignEnd}
            className={`flex-1 py-5 px-6 rounded-2xl font-black text-lg tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-3 cursor-pointer shadow-xl ${
              isHoldingSign
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white scale-[0.98] ring-4 ring-pink-500'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
            }`}
          >
            <Camera className="w-6 h-6" />
            <span>{isHoldingSign ? '🔴 SIGNING...' : 'HOLD TO SIGN'}</span>
          </button>

          {/* Button 2: HOLD TO SPEAK (Hearing User) */}
          <button
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceEnd}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceEnd}
            className={`flex-1 py-5 px-6 rounded-2xl font-black text-lg tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-3 cursor-pointer shadow-xl ${
              isRecordingVoice
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white scale-[0.98] ring-4 ring-red-500'
                : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white'
            }`}
          >
            <Mic className="w-6 h-6" />
            <span>{isRecordingVoice ? '🔴 LISTENING...' : 'HOLD TO SPEAK'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
