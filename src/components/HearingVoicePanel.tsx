import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Sparkles, Send, RefreshCw, Radio, Check, MessageSquare } from 'lucide-react';
import { speechService } from '../services/speechService';
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

  // Update if external glosses changed
  useEffect(() => {
    if (externalGlossesToDisplay && externalGlossesToDisplay.length > 0) {
      setActiveGlosses(externalGlossesToDisplay);
      if (externalExpression) setActiveExpression(externalExpression);
    }
  }, [externalGlossesToDisplay, externalExpression]);

  // Start speech recognition
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
      // If STT isn't supported, fallback text input focus
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

  // Send speech to backend Gemini to decompose into ISL glosses & expression
  const handleProcessSpeech = async (spokenSentence: string) => {
    if (!spokenSentence.trim()) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/speech-to-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: spokenSentence }),
      });

      const data = await res.json();
      const glosses: string[] = data.glosses || ['HELLO'];
      const expression: string = data.expression || 'NEUTRAL';

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

  // Quick preset sentences for kiosk demo
  const quickPresets = [
    'Welcome to Jain University!',
    'Where is the registration desk?',
    'Do you need some drinking water?',
    'Please wait here for the doctor',
    'Thank you for presenting your project',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Panel Header */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-600/40 flex items-center justify-center text-indigo-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-1.5">
              <span>Voice & Visual Sign Response</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                Hearing User
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Spoken voice → AI converts to ISL visual sign avatar</p>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex items-center space-x-2 text-xs">
          {isRecording ? (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-950 border border-red-800 text-red-300 font-mono text-[10px] animate-pulse">
              <Radio className="w-3 h-3 text-red-500 animate-spin" />
              <span>LISTENING</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>MIC READY</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Avatar / Visual Sign Animation Display */}
      <div className="relative flex-1 min-h-[320px] bg-slate-950 flex flex-col p-4">
        <SignAvatar
          glossSequence={activeGlosses}
          expression={activeExpression}
          isAnimating={activeGlosses.length > 0}
          onAnimationComplete={() => {}}
        />

        {/* Active Speech Transcription Card */}
        {(interimText || isRecording) && (
          <div className="mt-3 p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/50 text-white backdrop-blur-md shadow-lg animate-in fade-in">
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-mono mb-1">
              <Radio className="w-3 h-3 text-red-400 animate-ping" />
              <span>Live Speech-to-Text:</span>
            </div>
            <p className="text-base font-bold text-white tracking-wide">
              {interimText || 'Listening... Speak into microphone'}
            </p>
          </div>
        )}

        {/* Quick Demo Sentences */}
        <div className="mt-3">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Booth Quick Test Phrases:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((phrase, i) => (
              <button
                key={i}
                onClick={() => handleProcessSpeech(phrase)}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600 hover:text-white text-slate-300 text-[11px] font-medium border border-slate-700 transition flex items-center space-x-1"
              >
                <span>"{phrase}"</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manual text backup input for noisy environments */}
      <form onSubmit={handleManualSubmit} className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Or type sentence (e.g. Can you show me the way?)"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!manualText.trim() || isProcessing}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
        >
          {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Send</span>
        </button>
      </form>

      {/* HUGE Tactile Kiosk Action Button: "HOLD TO SPEAK" */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <button
          onMouseDown={handleStartSpeaking}
          onMouseUp={handleStopSpeaking}
          onTouchStart={handleStartSpeaking}
          onTouchEnd={handleStopSpeaking}
          className={`w-full py-5 rounded-2xl font-black text-xl tracking-wider uppercase transition-all duration-150 select-none flex items-center justify-center space-x-3 shadow-2xl cursor-pointer ${
            isRecording
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white scale-[0.98] ring-4 ring-red-500/50 shadow-red-500/40'
              : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white hover:shadow-indigo-600/30 ring-1 ring-indigo-400/30'
          }`}
        >
          <Mic className={`w-7 h-7 ${isRecording ? 'animate-pulse text-white' : 'text-indigo-200'}`} />
          <span>{isRecording ? '🔴 LISTENING (RELEASE TO CONVERT)' : 'HOLD TO SPEAK'}</span>
          <span className="hidden sm:inline-block text-xs font-mono font-normal opacity-70 px-2 py-0.5 rounded bg-black/30 border border-white/20">
            MICROPHONE
          </span>
        </button>
      </div>
    </div>
  );
};
