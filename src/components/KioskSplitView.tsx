import React, { useState } from 'react';
import { CameraSignPanel } from './CameraSignPanel';
import { HearingVoicePanel } from './HearingVoicePanel';
import { ConversationTurn } from '../types/isl';
import { MessageSquare, ArrowRight, Volume2, Sparkles, Clock } from 'lucide-react';

interface KioskSplitViewProps {
  conversationHistory: ConversationTurn[];
  onAddTurn: (turn: ConversationTurn) => void;
}

export const KioskSplitView: React.FC<KioskSplitViewProps> = ({
  conversationHistory,
  onAddTurn,
}) => {
  const [activeExternalGlosses, setActiveExternalGlosses] = useState<string[]>([]);
  const [activeExternalExpression, setActiveExternalExpression] = useState<string>('NEUTRAL');

  const handleSignFinalized = (glosses: string[], fullSentence: string) => {
    const turn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      sender: 'deaf_signer',
      timestamp: Date.now(),
      rawInput: glosses.join(' • '),
      aiOutput: fullSentence,
      detectedGlosses: glosses,
      confidence: 0.92,
      audioPlayed: true,
    };
    onAddTurn(turn);
  };

  const handleSpeechFinalized = (speechText: string, glosses: string[], expression: string) => {
    const turn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      sender: 'hearing_speaker',
      timestamp: Date.now(),
      rawInput: speechText,
      aiOutput: glosses.join(' • '),
      detectedGlosses: glosses,
      expression,
    };
    setActiveExternalGlosses(glosses);
    setActiveExternalExpression(expression);
    onAddTurn(turn);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Two-Way Split Grid: Left = Deaf Signer (Camera), Right = Hearing Speaker (Voice/Avatar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[580px]">
        {/* Left Column: Sign to Voice (Deaf Participant) */}
        <div className="h-full">
          <CameraSignPanel
            isKioskActive={true}
            onSignSequenceFinalized={handleSignFinalized}
          />
        </div>

        {/* Right Column: Voice to Sign Avatar (Hearing Participant) */}
        <div className="h-full">
          <HearingVoicePanel
            onSpeechFinalized={handleSpeechFinalized}
            externalGlossesToDisplay={activeExternalGlosses}
            externalExpression={activeExternalExpression}
          />
        </div>
      </div>

      {/* Shared Kiosk Live Conversation Transcript Banner */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Two-Way Communication Log ({conversationHistory.length} Exchanges)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Powered by MediaPipe + Transfer Learning + Gemini 3.8 Flash
          </span>
        </div>

        {conversationHistory.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No dialogue yet. Use <strong>HOLD TO SIGN</strong> on the left or <strong>HOLD TO SPEAK</strong> on the right to start communicating!
          </div>
        ) : (
          <div className="flex flex-col space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {conversationHistory.slice().reverse().map((turn) => {
              const isDeaf = turn.sender === 'deaf_signer';
              return (
                <div
                  key={turn.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                    isDeaf
                      ? 'bg-purple-950/40 border-purple-800/40 text-purple-200'
                      : 'bg-indigo-950/40 border-indigo-800/40 text-indigo-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                          isDeaf ? 'bg-purple-800 text-white' : 'bg-indigo-800 text-white'
                        }`}
                      >
                        {isDeaf ? 'Deaf Participant (Signed)' : 'Hearing Participant (Spoken)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
                      <span>Input: {turn.rawInput}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </div>

                    <p className="text-sm font-extrabold text-white">
                      "{turn.aiOutput}"
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    {turn.confidence && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {Math.round(turn.confidence * 100)}% match
                      </span>
                    )}
                    {isDeaf && (
                      <span className="p-1 rounded bg-purple-900/60 text-purple-300">
                        <Volume2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
