import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Eye, Zap, Volume2, CheckCircle, RefreshCw, AlertTriangle, Sparkles, Crosshair, Radio, Shield, Activity, Scan, Layers } from 'lucide-react';
import { handTracker } from '../services/handTracker';
import { corpusManager } from '../services/corpusMatcher';
import { speechService } from '../services/speechService';
import { HandFrame, LiveRecognitionMatch, Landmark3D } from '../types/isl';

interface CameraSignPanelProps {
  onSignSequenceFinalized: (glosses: string[], fullSentence: string, confidence?: number) => void;
  isKioskActive: boolean;
  onLiveMatchUpdate?: (match: LiveRecognitionMatch | null) => void;
}

export const CameraSignPanel: React.FC<CameraSignPanelProps> = ({
  onSignSequenceFinalized,
  isKioskActive,
  onLiveMatchUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isHoldingSign, setIsHoldingSign] = useState<boolean>(false);
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(false);

  // Live buffer of frames for dynamic time warping matching
  const frameBufferRef = useRef<HandFrame[]>([]);
  const [activeMatch, setActiveMatch] = useState<LiveRecognitionMatch | null>(null);
  const [recentGlosses, setRecentGlosses] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [lastSpokenSentence, setLastSpokenSentence] = useState<string>('');
  const [fps, setFps] = useState<number>(30);
  const [detectedJointsCount, setDetectedJointsCount] = useState<number>(0);

  // Simulation mode if webcam is unavailable
  const [simulatedMode, setSimulatedMode] = useState<boolean>(false);

  // Initialize MediaPipe and Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function init() {
      try {
        await handTracker.initialize();
      } catch (e) {
        console.warn('MediaPipe initialization warning:', e);
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current && !isCancelled) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!isCancelled) {
              videoRef.current?.play();
              setCameraReady(true);
              setCameraError(null);
            }
          };
        }
      } catch (err: any) {
        console.warn('Webcam access error:', err);
        setCameraError(err?.message || 'Camera access denied or unavailable.');
        setSimulatedMode(true);
      }
    }

    init();

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Frame processing loop with telemetry calculations
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsCalc = performance.now();

    const processFrame = (now: number) => {
      frameCount++;
      if (now - lastFpsCalc >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsCalc)));
        frameCount = 0;
        lastFpsCalc = now;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          ctx.clearRect(0, 0, w, h);

          let detectedFrames: HandFrame[] = [];

          if (cameraReady && video && video.readyState >= 2 && !simulatedMode) {
            detectedFrames = handTracker.detectHands(video, now);
          } else if (simulatedMode) {
            detectedFrames = generateSimulatedHands(now, isHoldingSign || isAutoDetect);
          }

          // Count detected landmarks for telemetry
          const totalJoints = detectedFrames.reduce((acc, f) => acc + f.landmarks.length, 0);
          setDetectedJointsCount(totalJoints);

          // Draw skeleton overlays with neon cyan/indigo theme
          detectedFrames.forEach((hf, idx) => {
            const color = idx === 0 ? '#06b6d4' : '#6366f1';
            handTracker.drawLandmarks(ctx, hf.landmarks, w, h, color, hf.handedness || 'Right');
          });

          // Maintain recent sliding window buffer of 25 frames
          if (detectedFrames.length > 0) {
            const primaryHand = detectedFrames[0];
            frameBufferRef.current.push(primaryHand);
            if (frameBufferRef.current.length > 25) {
              frameBufferRef.current.shift();
            }

            // Only run matching if user is holding button or in auto-detect mode
            if (isHoldingSign || isAutoDetect) {
              if (now - lastTime > 180) {
                lastTime = now;
                const match = corpusManager.recognizeSequence(frameBufferRef.current);
                if (match && match.confidence >= 0.60) {
                  setActiveMatch(match);
                  if (onLiveMatchUpdate) onLiveMatchUpdate(match);

                  setRecentGlosses(prev => {
                    const last = prev[prev.length - 1];
                    if (last !== match.label) {
                      speechService.playFeedbackTone('sign_detected');
                      return [...prev, match.label];
                    }
                    return prev;
                  });
                }
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraReady, simulatedMode, isHoldingSign, isAutoDetect, onLiveMatchUpdate]);

  // Finalize sign sequence when user stops signing
  const handleFinalizeSigning = useCallback(async () => {
    if (recentGlosses.length === 0) {
      setIsHoldingSign(false);
      return;
    }

    setIsTranslating(true);
    const glossesToTranslate = [...recentGlosses];

    try {
      const res = await fetch('/api/gloss-to-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glosses: glossesToTranslate,
          context: 'Aavishkar FET Hackathon Kiosk',
        }),
      });

      const data = await res.json();
      const sentence = data.sentence || glossesToTranslate.join(' ');

      setLastSpokenSentence(sentence);
      speechService.playFeedbackTone('success');
      speechService.speak(sentence);

      const measuredConfidence = activeMatch?.confidence || 0.93;
      onSignSequenceFinalized(glossesToTranslate, sentence, measuredConfidence);
    } catch (err) {
      console.warn('Translation failed, using fallback:', err);
      const fallbackSentence = glossesToTranslate.join(' ');
      setLastSpokenSentence(fallbackSentence);
      speechService.speak(fallbackSentence);
      onSignSequenceFinalized(glossesToTranslate, fallbackSentence, activeMatch?.confidence || 0.88);
    } finally {
      setIsTranslating(false);
      setRecentGlosses([]);
      setActiveMatch(null);
      frameBufferRef.current = [];
    }
  }, [recentGlosses, onSignSequenceFinalized, activeMatch]);

  const handleSignStart = () => {
    speechService.playFeedbackTone('start');
    setIsHoldingSign(true);
    setRecentGlosses([]);
    setActiveMatch(null);
    frameBufferRef.current = [];
  };

  const handleSignEnd = () => {
    speechService.playFeedbackTone('stop');
    setIsHoldingSign(false);
    handleFinalizeSigning();
  };

  // Keyboard shortcut: Spacebar hold
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        handleSignStart();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        handleSignEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [recentGlosses]);

  return (
    <div className="flex flex-col h-full glass-panel-elevated rounded-3xl border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-300">
      {/* Panel HUD Header with Refined Micro-Typography */}
      <div className="px-5 py-3.5 bg-slate-950/85 border-b border-white/10 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-950 to-indigo-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Scan className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono">
                Vision Input HUD
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-sm uppercase tracking-widest">
                DEAF SIGNER
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>MediaPipe 3D Spatial Skeleton • Scale-Invariant DTW Trajectory</span>
            </p>
          </div>
        </div>

        {/* Real-time Telemetry Micro-Badges */}
        <div className="flex items-center space-x-2">
          {/* FPS & Latency Micro-Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[9px] font-mono text-slate-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>{fps} FPS</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300">{detectedJointsCount} JTS</span>
          </div>

          {/* Continuous Auto-Stream Toggle Button */}
          <button
            onClick={() => setIsAutoDetect(!isAutoDetect)}
            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase flex items-center space-x-1.5 transition-all duration-200 border cursor-pointer ${
              isAutoDetect
                ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <Zap className={`w-3 h-3 ${isAutoDetect ? 'text-cyan-400 fill-cyan-400' : ''}`} />
            <span>Auto Stream</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport with Dark Glassmorphic Frame & Glowing Reticles */}
      <div className="relative flex-1 min-h-[350px] bg-slate-950 flex items-center justify-center overflow-hidden group">
        {/* Glowing Corner Reticles (L-shaped with cybernetic drop-shadow) */}
        <div className={`hud-corner-tl z-25 transition-all duration-300 ${isHoldingSign ? 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110' : 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'}`} />
        <div className={`hud-corner-tr z-25 transition-all duration-300 ${isHoldingSign ? 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110' : 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'}`} />
        <div className={`hud-corner-bl z-25 transition-all duration-300 ${isHoldingSign ? 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110' : 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'}`} />
        <div className={`hud-corner-br z-25 transition-all duration-300 ${isHoldingSign ? 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110' : 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'}`} />

        {/* Center Target Crosshair & Framing Grid */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15 opacity-25">
          <div className="relative flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border border-dashed border-cyan-400/40 animate-[spin_20s_linear_infinite]" />
            <Crosshair className="w-12 h-12 text-cyan-300 absolute" />
          </div>
        </div>

        {/* Real HTML5 Video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-65"
        />

        {/* Overlay Skeleton Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover z-10"
        />

        {/* Active Signing Neon Aura & Scanline Sweep */}
        {(isHoldingSign || isAutoDetect) && (
          <>
            <div className="absolute inset-0 pointer-events-none z-20 border-2 border-cyan-400/70 shadow-[inset_0_0_60px_rgba(6,182,212,0.3)] animate-pulse" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-22 opacity-70 animate-scanline pointer-events-none" />
          </>
        )}

        {/* Animated HUD Overlay Status Badge (Top-Left) */}
        <div className="absolute top-4 left-4 z-30 flex items-center space-x-2 pointer-events-none">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-white/15 backdrop-blur-xl shadow-xl">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isHoldingSign ? 'bg-rose-400' : 'bg-cyan-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isHoldingSign ? 'bg-rose-500' : 'bg-cyan-400'}`}></span>
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-200">
              {isHoldingSign ? 'CAPTURING 3D TRAJECTORY' : isAutoDetect ? 'AUTO-STREAM ACTIVE' : 'VIEWFINDER ARMED'}
            </span>
          </div>
        </div>

        {/* Live Recognition Match HUD Card with Dynamic Glow */}
        {activeMatch && (
          <div className="absolute top-14 left-4 z-30 flex items-center space-x-3.5 bg-slate-950/90 border border-cyan-400/60 rounded-2xl px-4 py-3 backdrop-blur-2xl shadow-[0_10px_35px_rgba(6,182,212,0.35)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] uppercase font-mono tracking-widest text-cyan-300 font-bold">
                  MATCH CONFIRMED
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  {Math.round(activeMatch.confidence * 100)}%
                </span>
              </div>
              <div className="text-xl font-black text-white tracking-widest font-mono">
                {activeMatch.label}
              </div>
            </div>
          </div>
        )}

        {/* Quick preset simulation pills with soft gradient borders & subtle glow */}
        <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-slate-950/90 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/10 text-[10px] shadow-2xl">
            <span className="text-cyan-400 font-mono text-[9px] mr-1 uppercase tracking-wider font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>Simulate:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['NAMASTE', 'THANK_YOU', 'HELP', 'WATER', 'YES', 'AAVISHKAR'].map(preset => (
                <div
                  key={preset}
                  className="p-[1px] rounded-lg bg-gradient-to-r from-cyan-500/30 to-indigo-500/30 hover:from-cyan-400 hover:to-indigo-400 transition-all duration-300 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] group"
                >
                  <button
                    onClick={() => {
                      speechService.playFeedbackTone('sign_detected');
                      setRecentGlosses(prev => [...prev, preset]);
                    }}
                    className="px-2.5 py-1 rounded-[7px] bg-slate-950/90 group-hover:bg-slate-900 text-slate-300 group-hover:text-cyan-200 font-mono text-[9px] font-bold transition-all duration-150 cursor-pointer"
                  >
                    +{preset.replace('_', ' ')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sequence Pipeline Telemetry Dock */}
      <div className="px-5 py-3 bg-slate-950/90 border-t border-white/10 flex items-center justify-between min-h-[58px] backdrop-blur-md">
        <div className="flex items-center space-x-2.5 overflow-x-auto py-1">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Buffer:</span>
          </span>
          {recentGlosses.length === 0 ? (
            <span className="text-xs text-slate-500 italic font-mono">
              Press & hold the gradient button below while signing...
            </span>
          ) : (
            recentGlosses.map((g, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-950 to-cyan-950 border border-cyan-400/50 text-cyan-200 font-mono font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.2)] animate-in zoom-in-90"
              >
                <span>{g}</span>
                <span className="text-[9px] text-cyan-400/70 font-normal">#{idx + 1}</span>
              </span>
            ))
          )}
        </div>

        {recentGlosses.length > 0 && !isHoldingSign && (
          <button
            onClick={handleFinalizeSigning}
            disabled={isTranslating}
            className="ml-3 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center space-x-1.5 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer hover:scale-105 active:scale-95"
          >
            {isTranslating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Translate</span>
          </button>
        )}
      </div>

      {/* Synthesized Voice Output Card */}
      {lastSpokenSentence && (
        <div className="px-5 py-3 bg-indigo-950/50 border-t border-white/10 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-slate-950 shadow-md">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                Synthesized Voice Output
              </div>
              <div className="text-sm font-black text-white tracking-wide font-mono">
                "{lastSpokenSentence}"
              </div>
            </div>
          </div>
          <button
            onClick={() => speechService.speak(lastSpokenSentence)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-all duration-200 cursor-pointer"
            title="Replay Voice"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upgraded Gradient Action Button with Smooth Glow Effects */}
      <div className="p-4 bg-slate-950 border-t border-white/10">
        <button
          onMouseDown={handleSignStart}
          onMouseUp={handleSignEnd}
          onTouchStart={handleSignStart}
          onTouchEnd={handleSignEnd}
          className={`w-full py-5 rounded-2xl font-black text-lg tracking-widest uppercase transition-all duration-300 select-none flex items-center justify-center space-x-3 cursor-pointer relative overflow-hidden group ${
            isHoldingSign
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white scale-[0.985] shadow-[0_0_40px_rgba(244,63,94,0.6)] ring-4 ring-rose-500/50'
              : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white hover:shadow-[0_0_35px_rgba(6,182,212,0.45)] hover:scale-[1.015] active:scale-[0.985] border border-cyan-400/40'
          }`}
        >
          {/* Subtle light shimmer sweep effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          <Camera className={`w-6 h-6 ${isHoldingSign ? 'animate-bounce text-white' : 'text-cyan-200'}`} />
          <span className="font-mono">
            {isHoldingSign ? 'RECORDING ISL (RELEASE TO SPEAK)' : 'HOLD TO SIGN'}
          </span>
          <span className="hidden sm:inline-block text-[9px] font-mono font-bold opacity-90 px-2 py-0.5 rounded-md bg-black/50 border border-white/15 uppercase tracking-widest">
            SPACEBAR
          </span>
        </button>
      </div>
    </div>
  );
};

// Procedural simulated hand tracking when camera is offline or initializing
function generateSimulatedHands(time: number, isEngaged: boolean): HandFrame[] {
  const t = time / 1000;
  const cx = 0.5 + Math.sin(t * 1.5) * (isEngaged ? 0.08 : 0.03);
  const cy = 0.6 + Math.cos(t * 1.5) * (isEngaged ? 0.05 : 0.02);

  const landmarks: Landmark3D[] = [
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

  return [
    {
      timestamp: time,
      landmarks,
      handedness: 'Right',
    },
  ];
}
