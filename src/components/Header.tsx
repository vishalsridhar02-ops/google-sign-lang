import React from 'react';
import { Sparkles, Camera, Mic, Volume2, Database, LayoutGrid, Layers, Info, BookOpen } from 'lucide-react';
import { KioskLayout } from '../types/isl';

interface HeaderProps {
  currentTab: 'kiosk' | 'corpus' | 'techflow' | 'dictionary';
  onSelectTab: (tab: 'kiosk' | 'corpus' | 'techflow' | 'dictionary') => void;
  layout: KioskLayout;
  onToggleLayout: (layout: KioskLayout) => void;
  geminiActive: boolean;
  corpusCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  layout,
  onToggleLayout,
  geminiActive,
  corpusCount,
}) => {
  return (
    <header className="w-full bg-slate-950 border-b border-slate-800 text-white select-none sticky top-0 z-50 shadow-lg">
      {/* Top institution & hackathon bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-900">
        {/* Left: JAIN University Branding */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-10 px-3 rounded-lg bg-gradient-to-r from-blue-900 to-indigo-950 border border-blue-600/40 shadow-sm">
            <span className="text-blue-400 font-black text-sm tracking-widest mr-1">JGI</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-white tracking-wider leading-tight">JAIN</span>
              <span className="text-[8px] text-blue-300 uppercase tracking-tighter leading-none">Deemed-to-be Univ</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Center: Aavishkar FET Hackathon Badge */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-base tracking-wide bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">
                  आविष्कार AAVISHKAR
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 uppercase">
                  FET Hackathon
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Two-Way ISL Kiosk & Low-Resource Corpus</p>
            </div>
          </div>
        </div>

        {/* Right: Hardware Status & AI Badge */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Gemini AI Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${geminiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-mono text-[11px]">
              {geminiActive ? 'Gemini 3.8 Flash' : 'Hybrid AI Engine'}
            </span>
          </div>

          {/* Corpus Count Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-200">
            <Database className="w-3 h-3 text-purple-400" />
            <span className="font-mono text-[11px] font-bold">{corpusCount} Signs Ready</span>
          </div>

          {/* Git Export / Download */}
          <a
            href="/api/download-bundle"
            download="isl-kiosk.bundle"
            title="Download full Git repository bundle"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition text-[11px] font-mono font-bold"
          >
            <span>📦 Git Bundle</span>
          </a>

          {/* Layout Switcher (for Kiosk) */}
          {currentTab === 'kiosk' && (
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => onToggleLayout('split')}
                title="Split-Screen View (Deaf + Hearing)"
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  layout === 'split' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Split Screen</span>
              </button>
              <button
                onClick={() => onToggleLayout('overlay')}
                title="Overlay Fullscreen View"
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  layout === 'overlay' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Overlay HUD</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto">
        <nav className="flex space-x-1 py-1.5">
          <button
            onClick={() => onSelectTab('kiosk')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all ${
              currentTab === 'kiosk'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-pink-400" />
            <span>Live Kiosk</span>
            <span className="text-[10px] uppercase px-1.5 py-0.2 bg-purple-900/60 rounded text-purple-200">
              Two-Way
            </span>
          </button>

          <button
            onClick={() => onSelectTab('corpus')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all ${
              currentTab === 'corpus'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Low-Resource Corpus</span>
            <span className="text-[10px] uppercase px-1.5 py-0.2 bg-emerald-950 rounded text-emerald-300 border border-emerald-800">
              3-Shot Learning
            </span>
          </button>

          <button
            onClick={() => onSelectTab('dictionary')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all ${
              currentTab === 'dictionary'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>ISL Sign Guide</span>
          </button>

          <button
            onClick={() => onSelectTab('techflow')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all ${
              currentTab === 'techflow'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Info className="w-4 h-4 text-amber-400" />
            <span>Poster Architecture</span>
          </button>
        </nav>

        {/* Quick Kiosk Controls summary */}
        <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-400 py-1">
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">Hold Space</kbd>
            <span>Sign</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">Click</kbd>
            <span>Speak</span>
          </span>
        </div>
      </div>
    </header>
  );
};
