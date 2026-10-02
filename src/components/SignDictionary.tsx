import React, { useState } from 'react';
import { BookOpen, Search, Sparkles, CheckCircle2, Play, Volume2 } from 'lucide-react';
import { SEED_ISL_SIGNS } from '../data/seedCorpus';
import { corpusManager } from '../services/corpusMatcher';
import { speechService } from '../services/speechService';
import { SignDefinition } from '../types/isl';

export const SignDictionary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeSign, setActiveSign] = useState<SignDefinition>(SEED_ISL_SIGNS[0]);

  const allSigns = corpusManager.getAllSigns();

  const categories = ['All', 'Greetings', 'Emergency & Help', 'Everyday', 'Hackathon & Campus', 'Questions'];

  const filteredSigns = allSigns.filter(s => {
    const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchSearch = s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.englishMeaning.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 font-bold mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Indian Sign Language (ISL) Interactive Guide</span>
          </div>
          <h2 className="text-2xl font-black text-white">ISL Vocabulary & Signing Technique</h2>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Learn and practice the standard Indian Sign Language handshapes, finger positions, and facial expressions recognized by the Aavishkar kiosk.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search signs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid: Left Cards, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Cards (5 columns) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredSigns.map(sign => {
            const isSelected = activeSign?.id === sign.id;
            return (
              <div
                key={sign.id}
                onClick={() => setActiveSign(sign)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/80 border-purple-500 shadow-lg'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-white">{sign.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                      {sign.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{sign.englishMeaning}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{sign.samples.length} trained samples</span>
                  <span className="text-purple-400 font-bold">View details →</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Guide (7 columns) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-2xl font-black text-white">{activeSign.label}</h3>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 text-xs font-mono font-bold">
                  {activeSign.category}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{activeSign.englishMeaning}</p>
            </div>

            <button
              onClick={() => speechService.speak(activeSign.englishMeaning)}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition"
              title="Speak phrase"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase text-purple-400">Gesture Description</h4>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
              {activeSign.description}
            </p>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase text-purple-400">Step-by-Step Execution</h4>
            <div className="space-y-2">
              {activeSign.instructions.map((inst, i) => (
                <div key={i} className="flex items-start space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-200 font-mono text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">{inst}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips for Best Kiosk Accuracy */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/50 space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Camera Accuracy Tips</span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Keep your hands within the camera frame between chest and chin level. Ensure lighting is in front of you rather than behind. Hold the sign steadily for 1 second.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
