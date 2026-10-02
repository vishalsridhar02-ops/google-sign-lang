import React from 'react';
import { Sparkles, Camera, Mic, Volume2, Database, LayoutGrid, Layers, BookOpen, Activity, Terminal, Cpu } from 'lucide-react';
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
  const tabs = [
    {
      id: 'kiosk' as const,
      label: 'Live Kiosk Terminal',
      badge: 'Live',
      icon: Camera,
      iconColor: 'text-cyan-300',
    },
    {
      id: 'corpus' as const,
      label: '3-Shot Corpus Studio',
      badge: 'Few-Shot',
      icon: Database,
      iconColor: 'text-emerald-400',
    },
    {
      id: 'dictionary' as const,
      label: 'ISL Dictionary',
      badge: '12 Signs',
      icon: BookOpen,
      iconColor: 'text-indigo-400',
    },
    {
      id: 'techflow' as const,
      label: 'Architecture Poster',
      badge: 'System',
      icon: Cpu,
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="sticky top-3 z-50 w-full px-3 sm:px-6 pointer-events-none mb-3">
      {/* Floating Glass Pill Container */}
      <header className="max-w-7xl mx-auto glass-panel-elevated rounded-3xl border border-white/15 backdrop-blur-2xl shadow-[0_15px_50px_rgba(0,0,0,0.7)] p-2 sm:p-2.5 pointer-events-auto transition-all duration-300">
        {/* Top Floating Row: Institution & Live Status Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 border-b border-white/10 mb-2">
          {/* Left: JGI + Aavishkar Brand Lockup */}
          <div className="flex items-center space-x-3">
            {/* JGI Faculty Badge */}
            <div className="flex items-center h-8 px-2.5 rounded-xl bg-slate-950/80 border border-white/15 backdrop-blur-md shadow-inner">
              <span className="text-cyan-400 font-black text-xs tracking-widest mr-1.5">JGI</span>
              <div className="flex flex-col">
                <span className="font-black text-[10px] text-white tracking-widest leading-none">JAIN</span>
                <span className="text-[7px] text-cyan-300/80 font-mono uppercase tracking-tight mt-0.5">FET Kiosk</span>
              </div>
            </div>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            {/* Aavishkar Brand */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 p-px shadow-md shadow-indigo-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm tracking-wider bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent">
                    AAVISHKAR
                  </span>
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-indigo-950/90 text-cyan-300 border border-cyan-500/40 uppercase tracking-widest">
                    AI HUD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Telemetry Badges & View Controls */}
          <div className="flex items-center space-x-2">
            {/* Gemini Status */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/10 text-[10px] font-mono shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${geminiActive ? 'bg-cyan-400 opacity-75' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${geminiActive ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
              </span>
              <span className="text-slate-300 font-medium hidden md:inline">
                {geminiActive ? 'Gemini 3.8 Flash' : 'Hybrid AI'}
              </span>
            </div>

            {/* Corpus Count Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-[10px] font-mono shadow-sm">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>{corpusCount} Signs</span>
            </div>

            {/* Git Repo Download Pill */}
            <a
              href="/api/download-bundle"
              download="isl-kiosk.bundle"
              title="Download full Git repository bundle"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 hover:border-cyan-400/40 transition-all duration-200 text-[10px] font-mono shadow-sm"
            >
              <span>📦 Git</span>
            </a>

            {/* Layout Switcher (for Kiosk) */}
            {currentTab === 'kiosk' && (
              <div className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-white/10 shadow-inner">
                <button
                  onClick={() => onToggleLayout('split')}
                  title="Split-Screen View"
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
                    layout === 'split'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  onClick={() => onToggleLayout('overlay')}
                  title="Overlay HUD View"
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
                    layout === 'overlay'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span className="hidden sm:inline">HUD</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Pill Tab Navigation Bar with Smooth Active Indicators */}
        <div className="relative bg-slate-950/90 p-1.5 rounded-2xl border border-white/10 flex items-center justify-between gap-1 overflow-x-auto shadow-inner">
          <nav className="flex space-x-1.5 w-full">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 select-none cursor-pointer group ${
                    isActive
                      ? 'text-white shadow-[0_0_25px_rgba(6,182,212,0.35)] scale-[1.01]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Sliding Active Pill Background Indicator */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-cyan-600 to-purple-600 rounded-xl border border-cyan-400/50 shadow-md animate-in fade-in zoom-in-95 duration-200" />
                  )}

                  {/* Content inside Pill */}
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? 'text-white scale-110' : tab.iconColor + ' group-hover:scale-110'}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    <span
                      className={`text-[8px] font-mono px-1.5 py-0.2 rounded uppercase tracking-widest hidden md:inline-block ${
                        isActive
                          ? 'bg-black/40 text-cyan-200 border border-white/20'
                          : 'bg-white/[0.05] text-slate-400 border border-white/5'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </div>
  );
};
