import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Sparkles, Send, RefreshCw, Radio, Check, MessageSquare, Terminal, Activity, Waves } from 'lucide-react';
import { speechService } from '../services/speechService';
import { translateSpeechToSignSafe } from '../services/geminiService';
import { SignAvatar } from './SignAvatar';

interface HearingVoicePanelProps {
  onSpeechFinalized: (speechText: string, glosses: string[], expression: string) => void;
  externalGlossesToDisplay?: string[];
  externalExpression?: string;
}

export const HearingVoicePanel: React.FC<HearingVoicePanelProps> = ({
  onSpeechFinalized,
  externalGlossesToDisplay,
  externalExpression,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeGlosses, setActiveGlosses] = useState<string[]>([]);
  const [activeExpression, setActiveExpression] = useState<string>('NEUTRAL');
  const [manualText, setManualText] = useState<string>('');

  useEffect(() => {
    if (externalGlossesToDisplay && externalGlossesToDisplay.length > 0) {
      setActiveGlosses(externalGlossesToDisplay);
      if (externalExpression) setActiveExpression(externalExpression);
    }
  }, [externalGlossesToDisplay, externalExpression]);

  const handleStartSpeaking = () => {
    setInterimText('');
    const started = speechService.startListening(
      (text, isFinal) => {
        setInterimText(text);
        if (isFinal) {
          handleProcessSpeech(text);
        }
      },
      (err) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      }
    );

    if (started) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
    }
  };

  const handleStopSpeaking = () => {
    speechService.stopListening();
    setIsRecording(false);
    if (interimText.trim()) {
      handleProcessSpeech(interimText);
    }
  };

  const handleProcessSpeech = async (spokenSentence: string) => {
    if (!spokenSentence.trim()) return;

    setIsProcessing(true);
    try {
      const result = await translateSpeechToSignSafe(spokenSentence);

      const glosses: string[] = result.glosses || ['HELLO'];
      const expression: string = result.expression || 'NEUTRAL';

      setActiveGlosses(glosses);
      setActiveExpression(expression);

      onSpeechFinalized(spokenSentence, glosses, expression);
    } catch (err) {
      console.warn('Failed decomposing speech:', err);
      const fallbackGlosses = ['HELLO', 'WELCOME'];
      setActiveGlosses(fallbackGlosses);
      onSpeechFinalized(spokenSentence, fallbackGlosses, 'NEUTRAL');
    } finally {
      setIsProcessing(false);
      setInterimText('');
      setManualText('');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualText.trim()) {
      handleProcessSpeech(manualText.trim());
    }
  };

  const quickPresets = [
    'Welcome to Jain University!',
    'Where is the registration desk?',
    'Do you need some drinking water?',
    'Please wait here for the doctor',
    'Thank you for presenting your project',
  ];

  return (
    <div className="flex flex-col h-full glass-panel-elevated rounded-3xl border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-300">
      {/* Panel HUD Header with Refined Micro-Typography */}
      <div className="px-5 py-3.5 bg-slate-950/85 border-b border-white/10 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono">
                Avatar Synthesis HUD
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-500/50 shadow-sm uppercase tracking-widest">
                HEARING USER
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>Spoken Speech → Gemini ISL Grammar → Hologram Keyframes</span>
            </p>
          </div>
        </div>

        {/* Live Audio Streaming Status Badge */}
        <div className="flex items-center space-x-2">
          {isRecording ? (
            <span className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-300 font-mono text-[9px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse">
              <Waves className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span>RECORDING AUDIO</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-mono text-[9px] font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>MIC STANDBY</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Avatar & Hologram Viewport */}
      <div className="relative flex-1 min-h-[350px] bg-slate-950 flex flex-col p-4">
        <SignAvatar
          glossSequence={activeGlosses}
          expression={activeExpression}
          isAnimating={activeGlosses.length > 0}
          onAnimationComplete={() => {}}
        />

        {/* Active Speech Transcription Card */}
        {(interimText || isRecording) && (
          <div className="mt-3 p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-400/50 text-white backdrop-blur-2xl shadow-[0_10px_35px_rgba(99,102,241,0.3)] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-indigo-300 text-xs font-mono mb-1">
              <div className="flex items-center space-x-2">
                <Radio className="w-3 h-3 text-rose-400 animate-ping" />
                <span className="uppercase tracking-widest text-[9px] font-bold">Audio Stream Decoded:</span>
              </div>
              <span className="text-[9px] font-mono text-indigo-400">Web Speech STT</span>
            </div>
            <p className="text-sm font-black text-white tracking-wide font-mono">
              {interimText || 'Listening... Speak into microphone'}
            </p>
          </div>
        )}

        {/* Quick Demo Sentences with Soft Gradient Borders & Hover Glow */}
        <div className="mt-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Kiosk Quick-Test Phrases:</span>
            </div>
            <span className="text-[8px] text-slate-500 font-mono">1-Click Voice Emulation</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((phrase, i) => (
              <div
                key={i}
                className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/40 via-cyan-500/25 to-purple-500/30 hover:from-indigo-400/90 hover:via-cyan-400/80 hover:to-purple-400/80 transition-all duration-300 hover:shadow-[0_0_16px_rgba(99,102,241,0.35)] group"
              >
                <button
                  onClick={() => handleProcessSpeech(phrase)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-[11px] bg-slate-950/90 group-hover:bg-slate-900/95 text-slate-300 group-hover:text-white text-[10px] font-mono transition-all duration-200 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:bg-cyan-300 transition-colors" />
                  <span>"{phrase}"</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual text terminal backup */}
      <form onSubmit={handleManualSubmit} className="px-4 py-2.5 bg-slate-950/90 border-t border-white/10 flex items-center space-x-2 backdrop-blur-md">
        <div className="relative flex-1">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type sentence (e.g. Can you show me the way?)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-tight"
          />
        </div>
        <button
          type="submit"
          disabled={!manualText.trim() || isProcessing}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center space-x-1.5 shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer hover:scale-105 active:scale-95"
        >
          {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Send</span>
        </button>
      </form>

      {/* Upgraded Gradient Action Button with Smooth Glow Effects */}
      <div className="p-4 bg-slate-950 border-t border-white/10">
        <button
          onMouseDown={handleStartSpeaking}
          onMouseUp={handleStopSpeaking}
          onTouchStart={handleStartSpeaking}
          onTouchEnd={handleStopSpeaking}
          className={`w-full py-5 rounded-2xl font-black text-lg tracking-widest uppercase transition-all duration-300 select-none flex items-center justify-center space-x-3 cursor-pointer relative overflow-hidden group ${
            isRecording
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white scale-[0.985] shadow-[0_0_40px_rgba(244,63,94,0.6)] ring-4 ring-rose-500/50'
              : 'bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-600 hover:from-indigo-500 hover:via-cyan-500 hover:to-teal-500 text-white hover:shadow-[0_0_35px_rgba(99,102,241,0.45)] hover:scale-[1.015] active:scale-[0.985] border border-indigo-400/40'
          }`}
        >
          {/* Subtle light shimmer sweep on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          <Mic className={`w-6 h-6 ${isRecording ? 'animate-pulse text-white' : 'text-cyan-200'}`} />
          <span className="font-mono">
            {isRecording ? 'STREAMING MIC (RELEASE TO SIGN)' : 'HOLD TO SPEAK'}
          </span>
          <span className="hidden sm:inline-block text-[9px] font-mono font-bold opacity-90 px-2 py-0.5 rounded-md bg-black/50 border border-white/15 uppercase tracking-widest">
            MIC
          </span>
        </button>
      </div>
    </div>
  );
};
