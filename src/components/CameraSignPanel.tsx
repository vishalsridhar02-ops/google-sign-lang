import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Eye, Zap, Volume2, CheckCircle, RefreshCw, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { handTracker } from '../services/handTracker';
import { corpusManager } from '../services/corpusMatcher';
import { speechService } from '../services/speechService';
import { HandFrame, LiveRecognitionMatch, Landmark3D } from '../types/isl';

interface CameraSignPanelProps {
  onSignSequenceFinalized: (glosses: string[], fullSentence: string) => void;
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

  // Frame processing loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const processFrame = (now: number) => {
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
            // Generate interactive or synthetic hand when in simulation
            detectedFrames = generateSimulatedHands(now, isHoldingSign || isAutoDetect);
          }

          // Draw skeleton overlays for each detected hand
          detectedFrames.forEach((hf, idx) => {
            const color = idx === 0 ? '#a855f7' : '#3b82f6'; // purple / blue
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
              if (now - lastTime > 180) { // Evaluate every 180ms
                lastTime = now;
                const match = corpusManager.recognizeSequence(frameBufferRef.current);
                if (match && match.confidence >= 0.65) {
                  setActiveMatch(match);
                  if (onLiveMatchUpdate) onLiveMatchUpdate(match);

                  // If confident and not already just added in the last 2 seconds
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

      onSignSequenceFinalized(glossesToTranslate, sentence);
    } catch (err) {
      console.warn('Translation failed, using fallback:', err);
      const fallbackSentence = glossesToTranslate.join(' ');
      setLastSpokenSentence(fallbackSentence);
      speechService.speak(fallbackSentence);
      onSignSequenceFinalized(glossesToTranslate, fallbackSentence);
    } finally {
      setIsTranslating(false);
      setRecentGlosses([]);
      setActiveMatch(null);
      frameBufferRef.current = [];
    }
  }, [recentGlosses, onSignSequenceFinalized]);

  // Handle pointer down / up on Hold to Sign button
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
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Panel Header */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-600/40 flex items-center justify-center text-purple-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-1.5">
              <span>Sign Input</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                Deaf User
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Camera captures hand gestures → AI translates to speech</p>
          </div>
        </div>

        {/* Auto-detect toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoDetect(!isAutoDetect)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
              isAutoDetect
                ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoDetect ? 'text-purple-400 fill-purple-400' : ''}`} />
            <span>Continuous</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport & Landmark Canvas */}
      <div className="relative flex-1 min-h-[320px] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Real HTML5 Video element (hidden/mirrored behind canvas) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60"
        />

        {/* High contrast overlay canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover z-10"
        />

        {/* Active Signing Glow Border */}
        {(isHoldingSign || isAutoDetect) && (
          <div className="absolute inset-0 pointer-events-none z-20 border-4 border-purple-500/80 shadow-[inset_0_0_40px_rgba(168,85,247,0.4)] animate-pulse" />
        )}

        {/* Real-time Recognition Badge Overlay */}
        {activeMatch && (
          <div className="absolute top-4 left-4 z-30 flex items-center space-x-3 bg-slate-950/90 border border-purple-500 rounded-xl px-4 py-2 backdrop-blur-md shadow-2xl animate-in fade-in duration-200">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-bold">
                Recognized Sign ({Math.round(activeMatch.confidence * 100)}%)
              </div>
              <div className="text-xl font-black text-white tracking-wider">
                {activeMatch.label}
              </div>
            </div>
          </div>
        )}

        {/* If Camera Permission Denied banner */}
        {cameraError && (
          <div className="absolute top-4 right-4 z-30 max-w-xs bg-amber-950/90 border border-amber-600/50 rounded-xl p-3 text-xs text-amber-200 backdrop-blur-md">
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Camera Stream Notice</span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              Camera direct access is using Interactive Simulation Mode so you can test all features right now.
            </p>
            <button
              onClick={() => {
                setSimulatedMode(false);
                window.location.reload();
              }}
              className="mt-2 text-[10px] font-bold underline text-amber-300 hover:text-white"
            >
              Retry Camera Permission
            </button>
          </div>
        )}

        {/* Interactive Gesture Simulator Controls (for quick booth testing) */}
        <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center space-x-1 bg-slate-900/85 backdrop-blur-md px-2 py-1.5 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 font-medium mr-1">Simulate Gesture:</span>
            {['NAMASTE', 'THANK_YOU', 'HELP', 'WATER', 'YES', 'AAVISHKAR'].map(preset => (
              <button
                key={preset}
                onClick={() => {
                  speechService.playFeedbackTone('sign_detected');
                  setRecentGlosses(prev => [...prev, preset]);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white font-mono text-[10px] border border-slate-700 transition"
              >
                +{preset.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recognized Gloss Pipeline Sequence */}
      <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between min-h-[56px]">
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider whitespace-nowrap">
            Sign Sequence:
          </span>
          {recentGlosses.length === 0 ? (
            <span className="text-xs text-slate-500 italic">
              Hold the button below and perform ISL gestures...
            </span>
          ) : (
            recentGlosses.map((g, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500/60 text-white font-mono font-bold text-xs shadow-md animate-in zoom-in-90"
              >
                <span>{g}</span>
                <span className="text-[10px] text-purple-300 font-normal">#{idx + 1}</span>
              </span>
            ))
          )}
        </div>

        {recentGlosses.length > 0 && !isHoldingSign && (
          <button
            onClick={handleFinalizeSigning}
            disabled={isTranslating}
            className="ml-3 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shrink-0"
          >
            {isTranslating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Translate & Speak</span>
          </button>
        )}
      </div>

      {/* Natural Spoken Output Display (Translated for hearing person) */}
      {lastSpokenSentence && (
        <div className="px-5 py-3 bg-purple-950/40 border-t border-purple-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-full bg-purple-600 text-white">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-purple-300 font-bold">
                Spoken Out Loud (Hearing Person)
              </div>
              <div className="text-sm font-extrabold text-white">
                "{lastSpokenSentence}"
              </div>
            </div>
          </div>
          <button
            onClick={() => speechService.speak(lastSpokenSentence)}
            className="p-2 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 transition"
            title="Replay Voice"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HUGE Tactile Kiosk Action Button: "HOLD TO SIGN" */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <button
          onMouseDown={handleSignStart}
          onMouseUp={handleSignEnd}
          onTouchStart={handleSignStart}
          onTouchEnd={handleSignEnd}
          className={`w-full py-5 rounded-2xl font-black text-xl tracking-wider uppercase transition-all duration-150 select-none flex items-center justify-center space-x-3 shadow-2xl cursor-pointer ${
            isHoldingSign
              ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white scale-[0.98] ring-4 ring-pink-500/50 shadow-pink-500/40'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white hover:shadow-purple-600/30 ring-1 ring-purple-400/30'
          }`}
        >
          <Camera className={`w-7 h-7 ${isHoldingSign ? 'animate-bounce text-white' : 'text-purple-200'}`} />
          <span>{isHoldingSign ? '🔴 RECORDING SIGN (RELEASE TO SPEAK)' : 'HOLD TO SIGN'}</span>
          <span className="hidden sm:inline-block text-xs font-mono font-normal opacity-70 px-2 py-0.5 rounded bg-black/30 border border-white/20">
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

  // Generate 21 points relative to palm center
  const landmarks: Landmark3D[] = [
    { x: cx, y: cy + 0.15, z: 0 }, // wrist
    // Thumb
    { x: cx - 0.06, y: cy + 0.10, z: -0.01 },
    { x: cx - 0.09, y: cy + 0.05, z: -0.02 },
    { x: cx - 0.12, y: cy, z: -0.03 },
    { x: cx - 0.14, y: cy - 0.04, z: -0.04 },
    // Index
    { x: cx - 0.04, y: cy + 0.01, z: -0.01 },
    { x: cx - 0.04, y: cy - 0.07, z: -0.02 },
    { x: cx - 0.04, y: cy - 0.13, z: -0.02 },
    { x: cx - 0.04, y: cy - 0.18, z: -0.02 },
    // Middle
    { x: cx, y: cy, z: 0 },
    { x: cx, y: cy - 0.08, z: -0.01 },
    { x: cx, y: cy - 0.15, z: -0.01 },
    { x: cx, y: cy - 0.20, z: -0.01 },
    // Ring
    { x: cx + 0.04, y: cy + 0.01, z: 0.01 },
    { x: cx + 0.04, y: cy - 0.07, z: 0.01 },
    { x: cx + 0.04, y: cy - 0.13, z: 0.01 },
    { x: cx + 0.04, y: cy - 0.18, z: 0.01 },
    // Pinky
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
