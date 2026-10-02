import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, Sparkles, RefreshCw, Eye, MessageSquare, Layers, Crosshair, Terminal } from 'lucide-react';
import { handTracker } from '../services/handTracker';
import { corpusManager } from '../services/corpusMatcher';
import { speechService } from '../services/speechService';
import { SignAvatar } from './SignAvatar';
import { ConversationTurn, HandFrame, LiveRecognitionMatch } from '../types/isl';

interface KioskOverlayViewProps {
  onAddTurn: (turn: ConversationTurn) => void;
  onSwitchToSplit: () => void;
}

export const KioskOverlayView: React.FC<KioskOverlayViewProps> = ({
  onAddTurn,
  onSwitchToSplit,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isHoldingSign, setIsHoldingSign] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [activeMatch, setActiveMatch] = useState<LiveRecognitionMatch | null>(null);
  const [activeGlosses, setActiveGlosses] = useState<string[]>([]);
  const [interimVoice, setInterimVoice] = useState<string>('');
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('Ready • Press HOLD TO SIGN or HOLD TO SPEAK to initialize');
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>([]);
  const [avatarExpression, setAvatarExpression] = useState<string>('NEUTRAL');

  const frameBufferRef = useRef<HandFrame[]>([]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    async function init() {
      try {
        await handTracker.initialize();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.warn('Webcam in overlay mode error:', e);
      }
    }

    init();

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
          }

          detected.forEach(hf => {
            handTracker.drawLandmarks(ctx, hf.landmarks, canvas.width, canvas.height, '#06b6d4', hf.handedness);
          });

          if (detected.length > 0 && isHoldingSign) {
            frameBufferRef.current.push(detected[0]);
            if (frameBufferRef.current.length > 25) frameBufferRef.current.shift();

            const match = corpusManager.recognizeSequence(frameBufferRef.current);
            if (match && match.confidence >= 0.60) {
              setActiveMatch(match);
              setActiveGlosses(prev => {
                if (prev[prev.length - 1] !== match.label) {
                  speechService.playFeedbackTone('sign_detected');
                  return [...prev, match.label];
                }
                return prev;
              });
            }
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
  }, [isHoldingSign]);

  const handleSignEnd = async () => {
    speechService.playFeedbackTone('stop');
    setIsHoldingSign(false);

    if (activeGlosses.length > 0) {
      try {
        const res = await fetch('/api/gloss-to-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ glosses: activeGlosses }),
        });
        const data = await res.json();
        const sentence = data.sentence || activeGlosses.join(' ');
        setLastAnnouncement(sentence);
        speechService.speak(sentence);

        onAddTurn({
          id: `turn-${Date.now()}`,
          sender: 'deaf_signer',
          timestamp: Date.now(),
          rawInput: activeGlosses.join(' • '),
          aiOutput: sentence,
          confidence: activeMatch?.confidence || 0.92,
        });
      } catch (e) {
        const fallback = activeGlosses.join(' ');
        setLastAnnouncement(fallback);
        speechService.speak(fallback);
      } finally {
        setActiveGlosses([]);
        setActiveMatch(null);
        frameBufferRef.current = [];
      }
    }
  };

  const handleVoiceStart = () => {
    setInterimVoice('');
    const ok = speechService.startListening((text, isFinal) => {
      setInterimVoice(text);
      if (isFinal) {
        handleVoiceFinalize(text);
      }
    });
    if (ok) setIsRecordingVoice(true);
  };

  const handleVoiceEnd = () => {
    speechService.stopListening();
    setIsRecordingVoice(false);
    if (interimVoice.trim()) {
      handleVoiceFinalize(interimVoice);
    }
  };

  const handleVoiceFinalize = async (text: string) => {
    try {
      const res = await fetch('/api/speech-to-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: text }),
      });
      const data = await res.json();
      const glosses = data.glosses || ['HELLO'];
      const expression = data.expression || 'NEUTRAL';

      setAvatarGlosses(glosses);
      setAvatarExpression(expression);
      setLastAnnouncement(`Spoken: "${text}" → ISL: ${glosses.join(' ')}`);

      onAddTurn({
        id: `turn-${Date.now()}`,
        sender: 'hearing_speaker',
        timestamp: Date.now(),
        rawInput: text,
        aiOutput: glosses.join(' • '),
        expression,
      });
    } catch (e) {
      setAvatarGlosses(['HELLO']);
    } finally {
      setInterimVoice('');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[640px] bg-slate-950 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      {/* Sci-Fi HUD Viewfinder Corners */}
      <div className="hud-corner-tl z-25" />
      <div className="hud-corner-tr z-25" />
      <div className="hud-corner-bl z-25" />
      <div className="hud-corner-br z-25" />

      {/* Viewport video feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-70"
      />
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full object-cover z-10"
      />

      {/* Top Floating HUD Cards */}
      <div className="absolute top-6 left-6 right-6 z-30 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
        {/* Left: Announcement HUD */}
        <div className="glass-panel-elevated p-5 rounded-3xl max-w-xl shadow-2xl pointer-events-auto border border-white/10">
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Kiosk Neural Broadcast HUD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide leading-snug">
            "{lastAnnouncement}"
          </h2>
          {activeGlosses.length > 0 && (
            <div className="mt-3 flex items-center space-x-2 overflow-x-auto">
              {activeGlosses.map((g, idx) => (
                <span key={idx} className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 font-mono font-bold text-xs shadow-sm">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Floating Sign Avatar Picture-in-Picture */}
        <div className="w-72 h-60 rounded-3xl overflow-hidden border border-white/15 shadow-2xl pointer-events-auto bg-slate-950/90 backdrop-blur-xl">
          <SignAvatar
            glossSequence={avatarGlosses}
            expression={avatarExpression}
            isAnimating={avatarGlosses.length > 0}
          />
        </div>
      </div>

      {/* Active Aura Overlays */}
      {isHoldingSign && (
        <div className="absolute inset-0 pointer-events-none z-20 border-4 border-cyan-400/80 shadow-[inset_0_0_80px_rgba(6,182,212,0.4)] animate-pulse" />
      )}
      {isRecordingVoice && (
        <div className="absolute inset-0 pointer-events-none z-20 border-4 border-rose-500/80 shadow-[inset_0_0_80px_rgba(244,63,94,0.4)] animate-pulse" />
      )}

      {/* Bottom Floating Control Dock */}
      <div className="absolute bottom-8 left-6 right-6 z-30 flex items-center justify-center">
        <div className="glass-panel-elevated p-3 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 max-w-3xl w-full border border-white/15">
          {/* Button 1: HOLD TO SIGN */}
          <button
            onMouseDown={() => {
              speechService.playFeedbackTone('start');
              setIsHoldingSign(true);
            }}
            onMouseUp={handleSignEnd}
            onTouchStart={() => {
              speechService.playFeedbackTone('start');
              setIsHoldingSign(true);
            }}
            onTouchEnd={handleSignEnd}
            className={`flex-1 py-5 px-6 rounded-2xl font-black text-lg tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-3 cursor-pointer shadow-xl ${
              isHoldingSign
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white scale-[0.98] ring-4 ring-rose-500'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] border border-cyan-400/30'
            }`}
          >
            <Camera className="w-6 h-6" />
            <span>{isHoldingSign ? 'RECORDING ISL...' : 'HOLD TO SIGN'}</span>
          </button>

          {/* Button 2: HOLD TO SPEAK */}
          <button
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceEnd}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceEnd}
            className={`flex-1 py-5 px-6 rounded-2xl font-black text-lg tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-3 cursor-pointer shadow-xl ${
              isRecordingVoice
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white scale-[0.98] ring-4 ring-red-500'
                : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] border border-indigo-400/30'
            }`}
          >
            <Mic className="w-6 h-6" />
            <span>{isRecordingVoice ? 'STREAMING MIC...' : 'HOLD TO SPEAK'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
