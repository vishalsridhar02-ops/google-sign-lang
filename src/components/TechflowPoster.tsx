import React from 'react';
import { Sparkles, Layers, Cpu, Radio, Volume2, Video, Database, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export const TechflowPoster: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 select-none">
      {/* Poster Style Canvas Board */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle Watermark Branding */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-9xl font-black text-purple-400">
          AAVISHKAR
        </div>

        {/* Poster Header */}
        <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-purple-800/40 gap-4 text-center md:text-left">
          {/* Institution */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-blue-900 border border-blue-500/50 shadow-md">
              <span className="text-blue-300 font-black text-xl tracking-widest mr-1.5">JGI</span>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-base text-white leading-none">JAIN</span>
                <span className="text-[9px] text-blue-200 uppercase tracking-tighter leading-none">Deemed-to-be University</span>
              </div>
            </div>
          </div>

          {/* Hackathon Title */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl md:text-3xl font-black tracking-wider bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">
                आविष्कार AAVISHKAR
              </span>
            </div>
            <span className="text-xs font-mono font-bold tracking-widest text-purple-300 uppercase">
              FET HACKATHON • INNOVATION EXPO
            </span>
          </div>

          {/* Department */}
          <div className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
            FET Alumni & Outreach
          </div>
        </div>

        {/* 3 Main Poster Columns: Tech Stack | Workflow | Techflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {/* Column 1: Tech Stack */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-purple-900/40 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-purple-800/30 pb-3">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-black text-white tracking-wide">Tech Stack</h3>
            </div>

            <ul className="space-y-2.5 text-sm">
              {[
                { name: 'React.js', desc: 'Modern SPA with Vite & Tailwind CSS' },
                { name: 'Python / Express & FastAPI', desc: 'Real-time proxy & WebSocket endpoints' },
                { name: 'MediaPipe Vision', desc: 'Real-time 21 3D hand landmarks' },
                { name: 'OpenCV / Canvas', desc: 'Spatial tracking & skeleton overlay' },
                { name: 'LSTM / GRU & DTW', desc: 'Dynamic Time Warping temporal matcher' },
                { name: 'Transfer Learning', desc: 'Few-shot corpus learning with 3 samples' },
                { name: 'Google Gemini (gemini-3.8-flash)', desc: 'Gloss to natural English & sign decomposition' },
                { name: 'Speech-to-Text (STT)', desc: 'Real-time audio transcription' },
                { name: 'Text-to-Speech (TTS)', desc: 'Indian English synthesized voice' },
                { name: 'Supabase / Local Corpus', desc: 'Persistent low-resource sign storage' },
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-2.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-extrabold text-white text-xs">{item.name}</span>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Workflow */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-purple-900/40 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 border-b border-purple-800/30 pb-3">
              <Layers className="w-5 h-5 text-pink-400" />
              <h3 className="text-xl font-black text-white tracking-wide">Workflow</h3>
            </div>

            {/* Workflow 1: Sign to Speech */}
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
              <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">
                1. Sign → Camera → Voice Output
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-mono">
                <span className="px-2 py-0.5 rounded bg-purple-900 text-white font-bold">Sign</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Camera</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Landmarks</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-purple-800 text-white font-bold">AI Recognizer</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-indigo-800 text-white font-bold">Gemini LLM</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-bold">Voice Output</span>
              </div>
            </div>

            {/* Workflow 2: Voice to Visual Sign */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
              <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase">
                2. Voice → Mic → Visual ISL Response
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-mono">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-bold">Voice</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Mic</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">STT</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-indigo-800 text-white font-bold">Gemini LLM</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-pink-900 text-pink-200 font-bold">Visual Sign Avatar</span>
              </div>
            </div>

            {/* Workflow 3: Low-Resource Corpus Builder */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-2">
              <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase">
                3. Low-Resource 3-Shot Learning
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-900 text-white font-bold">New Sign</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Record 3-20 Ex</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Landmarks</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-teal-800 text-white font-bold">Transfer Learning</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-bold">Ready in Kiosk</span>
              </div>
            </div>
          </div>

          {/* Column 3: Techflow Pipeline */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-purple-900/40 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-purple-800/30 pb-3">
              <Radio className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-black text-white tracking-wide">Techflow</h3>
            </div>

            {/* Interactive pipeline step cards */}
            <div className="space-y-3">
              {[
                {
                  step: 'Input Layer',
                  title: 'Camera + Mic Ingestion',
                  desc: 'Dual 60fps video capture & real-time Web Speech audio stream with noise suppression.',
                },
                {
                  step: 'Vision Layer',
                  title: 'MediaPipe / OpenCV Landmarks',
                  desc: 'Sub-pixel 21 3D coordinate estimation for wrist, MCP, PIP, and finger joints.',
                },
                {
                  step: 'Classification Layer',
                  title: 'Dynamic Time Warping (DTW) & GRU',
                  desc: 'Scale/translation invariant feature matching against 3-shot low-resource corpus.',
                },
                {
                  step: 'Reasoning Layer',
                  title: 'Google Gemini 3.8 Flash LLM',
                  desc: 'Converts disjoint glosses into grammatical polite English sentences, and maps speech into ISL syntax.',
                },
                {
                  step: 'Output Layer',
                  title: 'Display & Audio Synthesis',
                  desc: 'High-contrast visual kiosk HUD, animated 3D ISL avatar, and clear speech synthesis.',
                },
              ].map((pipe, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-600 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">{pipe.step}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Stage 0{i + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{pipe.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{pipe.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
