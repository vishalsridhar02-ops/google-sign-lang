import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KioskSplitView } from './components/KioskSplitView';
import { KioskOverlayView } from './components/KioskOverlayView';
import { CorpusBuilder } from './components/CorpusBuilder';
import { TechflowPoster } from './components/TechflowPoster';
import { SignDictionary } from './components/SignDictionary';
import { corpusManager } from './services/corpusMatcher';
import { ConversationTurn, KioskLayout } from './types/isl';

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
    },
    {
      id: 'welcome-seed-2',
      sender: 'deaf_signer',
      timestamp: Date.now() - 15000,
      rawInput: 'NAMASTE • THANK YOU',
      aiOutput: 'Namaste, thank you very much for having us!',
      confidence: 0.95,
      audioPlayed: true,
    },
  ]);

  // Check backend health & Gemini status
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setGeminiActive(!!data.geminiActive);
      })
      .catch(() => {
        setGeminiActive(false);
      });

    const signs = corpusManager.getAllSigns();
    setCorpusCount(signs.length);
  }, [currentTab]);

  const handleAddTurn = (turn: ConversationTurn) => {
    setConversationHistory(prev => [...prev, turn]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-purple-600 selection:text-white">
      {/* Top University & Hackathon Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        layout={layout}
        onToggleLayout={setLayout}
        geminiActive={geminiActive}
        corpusCount={corpusCount}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full pb-8">
        {currentTab === 'kiosk' && (
          layout === 'split' ? (
            <KioskSplitView
              conversationHistory={conversationHistory}
              onAddTurn={handleAddTurn}
            />
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-4">
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

      {/* Persistent Bottom Hackathon Footer */}
      <footer className="w-full bg-slate-950/90 border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">JAIN (Deemed-to-be University)</span>
            <span>•</span>
            <span className="text-purple-400 font-medium">Faculty of Engineering & Technology (FET)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span>Aavishkar Hackathon Kiosk</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">3-Shot Few-Shot Learning Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
