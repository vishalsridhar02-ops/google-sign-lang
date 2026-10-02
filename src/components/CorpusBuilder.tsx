import React, { useState, useEffect, useRef } from 'react';
import { Database, Plus, Trash2, Video, CheckCircle, RefreshCw, Download, Upload, Sparkles, Layers, Play, Clock, ArrowRight } from 'lucide-react';
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

  // Load corpus on mount
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

  // Initialize camera for recording studio
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    async function setupCamera() {
      try {
        await handTracker.initialize();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
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
            // Simulated hand if camera denied
            detected = [{
              timestamp: now,
              landmarks: generateSyntheticHand(now),
              handedness: 'Right',
            }];
          }

          detected.forEach(hf => {
            handTracker.drawLandmarks(ctx, hf.landmarks, canvas.width, canvas.height, '#10b981', hf.handedness);
          });

          // If actively recording a sample, capture frames
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

  // Start 3-second countdown then record a 2.5-second sample
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

    // Record for 2200ms (~30 frames)
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

          // If reached 3 samples, trigger celebration!
          if (updated.samples.length === 3) {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          }
        }
      }
    }, 2200);
  };

  // Create new sign entry
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
      minExamplesRequired: 3, // As per hackathon specification
      samples: [],
      isBuiltIn: false,
      color: '#10b981',
    };

    corpusManager.addOrUpdateSign(newSign);
    refreshCorpus();
    setSelectedSign(newSign);
    setIsAddingNew(false);

    // Immediately prompt to record first sample
    triggerRecordSample(id);

    // Reset form
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

  // Export & Import
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner explaining Low-Resource Corpus & 3-Shot Learning */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-purple-950 p-6 rounded-2xl border border-emerald-800/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-900 text-emerald-300 font-mono text-xs font-bold border border-emerald-700">
              Low-Resource Transfer Learning
            </span>
            <span className="text-xs text-slate-400">• 3 to 20 Examples per Sign</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">
            Low-Resource Sign Corpus Studio
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Standard sign AI models require thousands of videos. Our system uses MediaPipe spatial-temporal landmark extraction with Dynamic Time Warping (DTW) and few-shot transfer matching. You only need <strong>3 recordings</strong> to teach the kiosk a completely new sign!
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsAddingNew(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-700/30 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Teach New Sign (3-Shot)</span>
          </button>

          <button
            onClick={handleExportCorpus}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            title="Export Corpus JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <label className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer" title="Import Corpus JSON">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportCorpus} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Studio Grid: Left Library, Right Recording & Inspection Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sign Dictionary List (4 columns) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col h-[650px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white">Registered Signs ({signs.length})</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Min: 3 Samples</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {signs.map(sign => {
              const sampleCount = sign.samples.length;
              const isTrained = sampleCount >= (sign.minExamplesRequired || 3);
              const isSelected = selectedSign?.id === sign.id;

              return (
                <div
                  key={sign.id}
                  onClick={() => setSelectedSign(sign)}
                  className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-purple-950/70 border-purple-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-white tracking-wide">
                      {sign.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isTrained
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      }`}
                    >
                      {isTrained ? `${sampleCount} Examples (Ready)` : `${sampleCount}/3 Examples (Need ${3 - sampleCount})`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1">{sign.englishMeaning}</p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
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
        <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col h-[650px] shadow-xl overflow-y-auto">
          {selectedSign ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-black text-white tracking-wide">
                      {selectedSign.label}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                      {selectedSign.category}
                    </span>
                    {selectedSign.isBuiltIn && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        System Built-in
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{selectedSign.englishMeaning}</p>
                </div>

                {!selectedSign.isBuiltIn && (
                  <button
                    onClick={() => handleDeleteSign(selectedSign.id)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg border border-rose-900/40 transition text-xs flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Sign</span>
                  </button>
                )}
              </div>

              {/* 3-Shot Training Progress Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                    3-Shot Low-Resource Training Progress
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {selectedSign.samples.length} / {selectedSign.minExamplesRequired || 3} Minimum Samples
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
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
                        className={`p-3 rounded-lg border text-center transition ${
                          isCompleted
                            ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="text-xs font-mono font-bold">Sample #{step}</span>
                        </div>
                        <p className="text-[10px]">
                          {isCompleted ? `${sample.frames?.length || 15} landmark frames` : 'Not recorded'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Webcam Recording Studio for this sign */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Landmark Extraction & Recording Studio</span>
                  </div>
                  {isRecordingSample && (
                    <span className="flex items-center space-x-1 text-xs text-red-400 font-mono animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>RECORDING ({recordedFramesCount} frames)...</span>
                    </span>
                  )}
                </div>

                {/* Video & Skeleton Canvas Box */}
                <div className="relative w-full h-[220px] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
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

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <span className="text-7xl font-black text-emerald-400 animate-ping">
                        {countdown}
                      </span>
                      <p className="text-sm font-bold text-white mt-2">Get ready to perform sign...</p>
                    </div>
                  )}

                  {isRecordingSample && (
                    <div className="absolute inset-0 z-20 border-4 border-red-500/80 animate-pulse pointer-events-none" />
                  )}
                </div>

                {/* Action to Record Sample */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    Hold position or perform motion continuously for 2.2 seconds.
                  </p>
                  <button
                    onClick={() => triggerRecordSample(selectedSign.id)}
                    disabled={isRecordingSample || countdown !== null}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs tracking-wide shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Record Sample #{selectedSign.samples.length + 1}</span>
                  </button>
                </div>
              </div>

              {/* Signing Instructions */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                  How to Sign:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedSign.description}</p>
                {selectedSign.instructions && (
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                    {selectedSign.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Database className="w-12 h-12 mb-2 text-slate-700" />
              <p>Select a sign from the list or register a new sign</p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Sign Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Teach New Sign (3-Shot)</h3>
                  <p className="text-xs text-slate-400">Add a new vocabulary sign to the kiosk</p>
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
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Sign Label (Gloss) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CANTEEN, AUDITORIUM, LUNCH, WIFI"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  English Spoken Translation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Where is the student cafeteria?"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Sign Description & Movement Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Point forward with right hand and mimic holding a plate..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-emerald-900/30 transition flex items-center space-x-1.5"
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

// Procedural fallback hand generator
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
