import React, { useState, useEffect, useRef } from 'react';
import { Database, Plus, Trash2, Video, CheckCircle, RefreshCw, Download, Upload, Sparkles, Layers, Play, Clock, ArrowRight, Terminal, Crosshair, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { corpusManager } from '../services/corpusMatcher';
import { handTracker } from '../services/handTracker';
import { speechService } from '../services/speechService';
import { SignDefinition, HandFrame, SignSample, Landmark3D } from '../types/isl';

export const CorpusBuilder: React.FC = () => {
  const [signs, setSigns] = useState<SignDefinition[]>([]);
  const [selectedSign, setSelectedSign] = useState<SignDefinition | null>(null);

  // New Sign Modal & Recorder state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');
  const [newMeaning, setNewMeaning] = useState<string>('');
  const [newCategory, setNewCategory] = useState<SignDefinition['category']>('Custom');
  const [newDescription, setNewDescription] = useState<string>('');

  // Recording wizard state
  const [activeRecordingSignId, setActiveRecordingSignId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [recordedFramesCount, setRecordedFramesCount] = useState<number>(0);

  // Webcam stream for recording studio
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentSampleFramesRef = useRef<HandFrame[]>([]);
  const isRecordingRef = useRef<boolean>(false);

  const refreshCorpus = () => {
    const list = corpusManager.getAllSigns();
    setSigns(list);
    if (!selectedSign && list.length > 0) {
      setSelectedSign(list[0]);
    } else if (selectedSign) {
      const updated = list.find(s => s.id === selectedSign.id);
      if (updated) setSelectedSign(updated);
    }
  };

  useEffect(() => {
    refreshCorpus();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    async function setupCamera() {
      try {
        await handTracker.initialize();

        if (navigator?.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(playErr => {
              console.warn('Video play autoplay warning in corpus builder:', playErr);
            });
          }
        }
      } catch (e) {
        console.warn('Webcam in corpus builder unavailable:', e);
      }
    }

    setupCamera();

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
          } else {
            detected = [{
              timestamp: now,
              landmarks: generateSyntheticHand(now),
              handedness: 'Right',
            }];
          }

          detected.forEach(hf => {
            handTracker.drawLandmarks(ctx, hf.landmarks, canvas.width, canvas.height, '#06b6d4', hf.handedness);
          });

          if (isRecordingRef.current && detected.length > 0) {
            currentSampleFramesRef.current.push(detected[0]);
            setRecordedFramesCount(currentSampleFramesRef.current.length);
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
  }, []);

  const triggerRecordSample = (signId: string) => {
    speechService.playFeedbackTone('start');
    setActiveRecordingSignId(signId);
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        speechService.playFeedbackTone('start');
      } else {
        clearInterval(interval);
        setCountdown(null);
        startActualRecording(signId);
      }
    }, 1000);
  };

  const startActualRecording = (signId: string) => {
    currentSampleFramesRef.current = [];
    isRecordingRef.current = true;
    setIsRecordingSample(true);
    setRecordedFramesCount(0);
    speechService.playFeedbackTone('sign_detected');

    setTimeout(() => {
      isRecordingRef.current = false;
      setIsRecordingSample(false);
      speechService.playFeedbackTone('success');

      const frames = [...currentSampleFramesRef.current];
      if (frames.length >= 5) {
        const updated = corpusManager.addSampleToSign(signId, frames, 2200);
        if (updated) {
          refreshCorpus();
          setSelectedSign(updated);

          if (updated.samples.length === 3) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      }
    }, 2200);
  };

  const handleCreateSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const id = newLabel.trim().toUpperCase().replace(/\s+/g, '_');
    const newSign: SignDefinition = {
      id,
      label: newLabel.trim().toUpperCase(),
      englishGloss: newLabel.trim().toUpperCase(),
      englishMeaning: newMeaning.trim() || newLabel.trim(),
      category: newCategory,
      description: newDescription.trim() || 'Custom recorded sign for kiosk',
      instructions: ['Perform gesture in front of camera smoothly 3 times.'],
      minExamplesRequired: 3,
      samples: [],
      isBuiltIn: false,
      color: '#06b6d4',
    };

    corpusManager.addOrUpdateSign(newSign);
    refreshCorpus();
    setSelectedSign(newSign);
    setIsAddingNew(false);

    triggerRecordSample(id);

    setNewLabel('');
    setNewMeaning('');
    setNewDescription('');
  };

  const handleDeleteSign = (id: string) => {
    if (window.confirm(`Are you sure you want to remove "${id}" from the corpus?`)) {
      corpusManager.deleteSign(id);
      refreshCorpus();
      setSelectedSign(null);
    }
  };

  const handleExportCorpus = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(signs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aavishkar-isl-corpus-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportCorpus = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: SignDefinition) => corpusManager.addOrUpdateSign(s));
            refreshCorpus();
            alert(`Successfully imported ${parsed.length} signs into corpus!`);
          }
        } catch (err) {
          alert('Invalid JSON file format.');
        }
      };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner explaining Low-Resource Corpus & 3-Shot Learning */}
      <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <span className="px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-widest border border-cyan-500/40">
              Low-Resource Transfer Learning
            </span>
            <span className="text-xs text-slate-400 font-mono">• 3 to 20 Exemplars per Sign</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            Low-Resource Sign Corpus Studio
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-mono">
            Traditional vision models require thousands of training videos. Our system extracts 21 3D spatial landmarks and classifies temporal motion via Dynamic Time Warping (DTW). You only need <strong className="text-cyan-400">3 recordings</strong> to teach the kiosk a completely new sign!
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsAddingNew(true)}
            className="px-5 py-3 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-2xl text-xs font-mono font-bold tracking-wider uppercase shadow-xl shadow-cyan-500/25 flex items-center space-x-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-cyan-400/40"
          >
            <Plus className="w-4 h-4" />
            <span>Teach New Sign (3-Shot)</span>
          </button>

          <button
            onClick={handleExportCorpus}
            className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 transition-all duration-200"
            title="Export Corpus JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <label className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 transition-all duration-200 cursor-pointer" title="Import Corpus JSON">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportCorpus} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Studio Grid: Left Library, Right Recording & Inspection Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sign Dictionary List (4 columns) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl border border-white/10 p-5 flex flex-col h-[650px] shadow-2xl">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Registered Signs ({signs.length})</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Min: 3 Samples</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {signs.map(sign => {
              const sampleCount = sign.samples.length;
              const isTrained = sampleCount >= (sign.minExamplesRequired || 3);
              const isSelected = selectedSign?.id === sign.id;

              return (
                <div
                  key={sign.id}
                  onClick={() => setSelectedSign(sign)}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-950/80 to-cyan-950/80 border-cyan-400/60 shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 border-white/5 hover:border-white/15 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-sm text-white tracking-wider">
                      {sign.label}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isTrained
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {isTrained ? `${sampleCount} Ex (Ready)` : `${sampleCount}/3 Ex (Need ${3 - sampleCount})`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono line-clamp-1">{sign.englishMeaning}</p>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/5">
                      {sign.category}
                    </span>
                    <span>{sign.isBuiltIn ? 'Core Seed' : 'Custom Added'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Sign Details & 3-Shot Recording Studio (8 columns) */}
        <div className="lg:col-span-8 glass-panel rounded-3xl border border-white/10 p-6 flex flex-col h-[650px] shadow-2xl overflow-y-auto">
          {selectedSign ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-2xl font-black text-white tracking-wider">
                      {selectedSign.label}
                    </h2>
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                      {selectedSign.category}
                    </span>
                    {selectedSign.isBuiltIn && (
                      <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        System Built-in
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-300 mt-1">{selectedSign.englishMeaning}</p>
                </div>

                {!selectedSign.isBuiltIn && (
                  <button
                    onClick={() => handleDeleteSign(selectedSign.id)}
                    className="p-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-xl border border-rose-500/30 transition-all duration-200 text-xs font-mono flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Sign</span>
                  </button>
                )}
              </div>

              {/* 3-Shot Training Progress Card */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
                    3-Shot Few-Shot Training Status
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {selectedSign.samples.length} / {selectedSign.minExamplesRequired || 3} Minimum Samples
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, (selectedSign.samples.length / (selectedSign.minExamplesRequired || 3)) * 100)}%`,
                    }}
                  />
                </div>

                {/* 3 Steps Visual Pills */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(step => {
                    const sample = selectedSign.samples[step - 1];
                    const isCompleted = !!sample;

                    return (
                      <div
                        key={step}
                        className={`p-3.5 rounded-xl border text-center transition-all duration-200 ${
                          isCompleted
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                            : 'bg-white/5 border-white/5 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1.5 mb-1">
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="text-xs font-mono font-bold">Sample #{step}</span>
                        </div>
                        <p className="text-[10px] font-mono">
                          {isCompleted ? `${sample.frames?.length || 15} landmark frames` : 'Pending'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Webcam Recording Studio for this sign */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">Landmark Trajectory Studio</span>
                  </div>
                  {isRecordingSample && (
                    <span className="flex items-center space-x-1.5 text-xs text-rose-400 font-mono animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>CAPTURING ({recordedFramesCount} frames)...</span>
                    </span>
                  )}
                </div>

                {/* Video & Skeleton Canvas Box */}
                <div className="relative w-full h-[220px] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
                  <div className="hud-corner-tl z-20 pointer-events-none" />
                  <div className="hud-corner-tr z-20 pointer-events-none" />
                  <div className="hud-corner-bl z-20 pointer-events-none" />
                  <div className="hud-corner-br z-20 pointer-events-none" />

                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60"
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                  />

                  {countdown !== null && (
                    <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center">
                      <span className="text-7xl font-black text-cyan-400 animate-ping">
                        {countdown}
                      </span>
                      <p className="text-xs font-mono font-bold text-white mt-2 uppercase tracking-widest">Get ready to execute sign...</p>
                    </div>
                  )}

                  {isRecordingSample && (
                    <div className="absolute inset-0 z-20 border-2 border-rose-500/80 animate-pulse pointer-events-none shadow-[inset_0_0_40px_rgba(244,63,94,0.4)]" />
                  )}
                </div>

                {/* Action to Record Sample */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400 font-mono">
                    Hold position or perform motion continuously for 2.2 seconds.
                  </p>
                  <button
                    onClick={() => triggerRecordSample(selectedSign.id)}
                    disabled={isRecordingSample || countdown !== null}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition-all duration-200 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Record Sample #{selectedSign.samples.length + 1}</span>
                  </button>
                </div>
              </div>

              {/* Signing Instructions */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-2 shadow-inner">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  Signing Instructions:
                </span>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">{selectedSign.description}</p>
                {selectedSign.instructions && (
                  <ul className="list-disc list-inside text-xs font-mono text-slate-400 space-y-1">
                    {selectedSign.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono">
              <Database className="w-12 h-12 mb-2 text-slate-700" />
              <p>Select a sign from the list or register a new sign</p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Sign Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-elevated border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">Register New ISL Sign</h3>
                  <p className="text-xs font-mono text-slate-400">3-shot low-resource dataset acquisition</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSign} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                  Sign Label (Gloss) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CANTEEN, AUDITORIUM, LUNCH, WIFI"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                  English Spoken Translation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Where is the student cafeteria?"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                >
                  <option value="Hackathon & Campus">Hackathon & Campus</option>
                  <option value="Greetings">Greetings</option>
                  <option value="Emergency & Help">Emergency & Help</option>
                  <option value="Everyday">Everyday</option>
                  <option value="Questions">Questions</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                  Sign Description & Movement Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Point forward with right hand and mimic holding a plate..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase shadow-lg shadow-cyan-500/25 transition-all duration-200 flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Create & Record Samples (3-Shot)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function generateSyntheticHand(time: number): Landmark3D[] {
  const t = time / 1000;
  const cx = 0.5 + Math.sin(t * 1.5) * 0.05;
  const cy = 0.6 + Math.cos(t * 1.5) * 0.03;

  return [
    { x: cx, y: cy + 0.15, z: 0 },
    { x: cx - 0.06, y: cy + 0.10, z: -0.01 },
    { x: cx - 0.09, y: cy + 0.05, z: -0.02 },
    { x: cx - 0.12, y: cy, z: -0.03 },
    { x: cx - 0.14, y: cy - 0.04, z: -0.04 },
    { x: cx - 0.04, y: cy + 0.01, z: -0.01 },
    { x: cx - 0.04, y: cy - 0.07, z: -0.02 },
    { x: cx - 0.04, y: cy - 0.13, z: -0.02 },
    { x: cx - 0.04, y: cy - 0.18, z: -0.02 },
    { x: cx, y: cy, z: 0 },
    { x: cx, y: cy - 0.08, z: -0.01 },
    { x: cx, y: cy - 0.15, z: -0.01 },
    { x: cx, y: cy - 0.20, z: -0.01 },
    { x: cx + 0.04, y: cy + 0.01, z: 0.01 },
    { x: cx + 0.04, y: cy - 0.07, z: 0.01 },
    { x: cx + 0.04, y: cy - 0.13, z: 0.01 },
    { x: cx + 0.04, y: cy - 0.18, z: 0.01 },
    { x: cx + 0.08, y: cy + 0.04, z: 0.02 },
    { x: cx + 0.09, y: cy - 0.03, z: 0.02 },
    { x: cx + 0.10, y: cy - 0.08, z: 0.02 },
    { x: cx + 0.11, y: cy - 0.12, z: 0.02 },
  ];
}
