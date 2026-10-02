import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KioskSplitView } from './components/KioskSplitView';
import { KioskOverlayView } from './components/KioskOverlayView';
import { CorpusBuilder } from './components/CorpusBuilder';
import { TechflowPoster } from './components/TechflowPoster';
import { SignDictionary } from './components/SignDictionary';
import { corpusManager } from './services/corpusMatcher';
import { ConversationTurn, KioskLayout } from './types/isl';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Terminal, Shield, Sparkles } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'kiosk' | 'corpus' | 'techflow' | 'dictionary'>('kiosk');
  const [layout, setLayout] = useState<KioskLayout>('split');
  const [geminiActive, setGeminiActive] = useState<boolean>(false);
  const [corpusCount, setCorpusCount] = useState<number>(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([
    {
      id: 'welcome-seed-1',
      sender: 'hearing_speaker',
      timestamp: Date.now() - 30000,
      rawInput: 'Welcome to the Aavishkar FET Hackathon at Jain University!',
      aiOutput: 'HELLO • WELCOME • JAIN UNIVERSITY • AAVISHKAR',
      expression: 'WELCOMING',
      confidence: 0.98,
    },
    {
      id: 'welcome-seed-2',
      sender: 'deaf_signer',
      timestamp: Date.now() - 15000,
      rawInput: 'NAMASTE • THANK YOU',
      aiOutput: 'Namaste, thank you very much for having us!',
      confidence: 0.95,
      audioPlayed: true,
      detectedGlosses: ['NAMASTE', 'THANK_YOU'],
    },
  ]);

  useEffect(() => {
    try {
      fetch('/api/health')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) {
            setGeminiActive(!!data.geminiActive);
          } else {
            setGeminiActive(false);
          }
        })
        .catch(() => {
          setGeminiActive(false);
        });

      const signs = corpusManager.getAllSigns();
      setCorpusCount(signs.length);
    } catch (e) {
      console.warn('App startup sync warning:', e);
    }
  }, [currentTab]);

  const handleAddTurn = (turn: ConversationTurn) => {
    setConversationHistory(prev => [...prev, turn]);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-black bg-hud-grid relative">
      {/* Top Ambient Glow Orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-radial-glow pointer-events-none z-0" />

      {/* Executive Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        layout={layout}
        onToggleLayout={setLayout}
        geminiActive={geminiActive}
        corpusCount={corpusCount}
      />

      {/* Main Viewport */}
      <main className="flex-1 w-full pb-8 relative z-10">
        {currentTab === 'kiosk' && (
          layout === 'split' ? (
            <KioskSplitView
              conversationHistory={conversationHistory}
              onAddTurn={handleAddTurn}
            />
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <KioskOverlayView
                onAddTurn={handleAddTurn}
                onSwitchToSplit={() => setLayout('split')}
              />
            </div>
          )
        )}

        {currentTab === 'corpus' && (
          <CorpusBuilder />
        )}

        {currentTab === 'dictionary' && (
          <SignDictionary />
        )}

        {currentTab === 'techflow' && (
          <TechflowPoster />
        )}
      </main>

      {/* Executive Terminal Footer */}
      <footer className="w-full glass-panel border-t border-white/5 py-4 text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="font-bold text-white tracking-wider">JAIN (Deemed-to-be University)</span>
            <span>•</span>
            <span className="text-cyan-400 font-medium">Faculty of Engineering & Technology (FET)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Terminal className="w-3 h-3 text-indigo-400" />
              <span>Aavishkar Kiosk v2.4</span>
            </span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">Few-Shot DTW Transfer Active</span>
          </div>
        </div>
      </footer>
    </div>
  </ErrorBoundary>
);
}
