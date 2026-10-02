import React, { useEffect, useRef, useState } from 'react';
import { Landmark3D } from '../types/isl';
import { HAND_CONNECTIONS } from '../services/handTracker';
import { SEED_ISL_SIGNS } from '../data/seedCorpus';
import { Sparkles, Activity, Layers, Radio } from 'lucide-react';

interface SignAvatarProps {
  glossSequence: string[];
  expression?: string;
  isAnimating: boolean;
  onAnimationComplete?: () => void;
}

export const SignAvatar: React.FC<SignAvatarProps> = ({
  glossSequence,
  expression = 'NEUTRAL',
  isAnimating,
  onAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentGlossIndex, setCurrentGlossIndex] = useState(0);
  const [activeGloss, setActiveGloss] = useState<string>('');

  useEffect(() => {
    if (!isAnimating || glossSequence.length === 0) {
      setActiveGloss('');
      return;
    }

    let isCancelled = false;
    let idx = 0;

    const playNext = () => {
      if (isCancelled) return;
      if (idx >= glossSequence.length) {
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      setCurrentGlossIndex(idx);
      setActiveGloss(glossSequence[idx]);
      idx++;

      setTimeout(playNext, 1800);
    };

    playNext();

    return () => {
      isCancelled = true;
    };
  }, [glossSequence, isAnimating]);

  // Render animated avatar on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      // Dark futuristic booth background with deep cyber shade
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Fine cybernetic grid with soft neon cyan tint
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Upper Body Silhouette (Head, Neck, Torso, Shoulders)
      const cx = w / 2;
      const headY = h * 0.28;
      const headR = 38;

      // Holographic shoulder aura
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx - 90, h * 0.62);
      ctx.bezierCurveTo(cx - 70, h * 0.44, cx - 30, h * 0.40, cx, h * 0.40);
      ctx.bezierCurveTo(cx + 30, h * 0.40, cx + 70, h * 0.44, cx + 90, h * 0.62);
      ctx.lineTo(cx + 100, h);
      ctx.lineTo(cx - 100, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Head with cyan outline
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Facial Expression Features
      ctx.fillStyle = '#67e8f9';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;

      const eyeY = headY - 4;
      const eyeOffset = 12;

      if (expression === 'QUESTION') {
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 3, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx, headY + 16, 5, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (expression === 'WELCOMING' || expression === 'THANKFUL') {
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 5, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + eyeOffset, eyeY, 5, Math.PI, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, headY + 12, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      } else if (expression === 'URGENT') {
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 4, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx - 10, headY + 16);
        ctx.lineTo(cx + 10, headY + 16);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 3, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, headY + 14, 8, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      // Hand gestures
      const currentSign = SEED_ISL_SIGNS.find(s => s.id === activeGloss || s.label.toUpperCase() === activeGloss.toUpperCase());
      const keyframe = currentSign?.avatarKeyframes?.[0];

      const t = (frame % 60) / 60;
      const wave = Math.sin(t * Math.PI * 2);

      // Right Hand
      if (keyframe?.handRight) {
        drawAvatarHand(ctx, keyframe.handRight, w, h, wave, '#06b6d4', 'Right');
      } else {
        drawRestingHand(ctx, cx + 55 + wave * 3, h * 0.68 + wave * 4, '#06b6d4');
      }

      // Left Hand
      if (keyframe?.handLeft) {
        drawAvatarHand(ctx, keyframe.handLeft, w, h, -wave, '#6366f1', 'Left');
      } else {
        drawRestingHand(ctx, cx - 55 - wave * 3, h * 0.68 + wave * 4, '#6366f1');
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeGloss, expression]);

  return (
    <div className="relative flex flex-col items-center w-full h-full bg-slate-950/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
      {/* Glowing Corner Reticles */}
      <div className="hud-corner-tl z-20 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      <div className="hud-corner-tr z-20 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      <div className="hud-corner-bl z-20 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      <div className="hud-corner-br z-20 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />

      {/* Top HUD Telemetry Banner */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
            HOLOGRAPHIC SYNTHESIS • {expression}
          </span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/10 text-[9px] font-mono text-indigo-300 backdrop-blur-xl">
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>42 KINEMATIC NODES</span>
        </div>
      </div>

      {/* Main avatar canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={320}
        className="w-full h-full object-cover max-h-[380px]"
      />

      {/* Active Gloss Sequence Dock */}
      <div className="w-full bg-slate-950/95 border-t border-white/10 p-3 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-950 to-cyan-950 border border-cyan-500/50 rounded-xl text-cyan-200 font-bold font-mono text-xs tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.25)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeGloss ? `SIGN: ${activeGloss}` : 'Awaiting Speech Input...'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            {glossSequence.length > 0 ? `Sign ${currentGlossIndex + 1} of ${glossSequence.length}` : 'Standby'}
          </span>
        </div>

        {/* Small sequence pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[200px] py-1">
          {glossSequence.map((g, i) => (
            <span
              key={i}
              className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold whitespace-nowrap transition-all duration-200 ${
                i === currentGlossIndex
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-400/50'
                  : i < currentGlossIndex
                  ? 'bg-white/5 text-slate-500 line-through'
                  : 'bg-slate-900 text-slate-400 border border-white/10'
              }`}
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

function drawAvatarHand(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark3D[],
  w: number,
  h: number,
  waveOffset: number,
  color: string,
  handedness: string
) {
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;

  const points = landmarks.map(p => ({
    x: p.x * w + (handedness === 'Right' ? waveOffset * 8 : -waveOffset * 8),
    y: p.y * h + waveOffset * 6,
    z: p.z,
  }));

  HAND_CONNECTIONS.forEach(([i, j]) => {
    if (points[i] && points[j]) {
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[j].x, points[j].y);
      ctx.stroke();
    }
  });

  points.forEach((p, idx) => {
    ctx.beginPath();
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    ctx.arc(p.x, p.y, isTip ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#38bdf8' : '#ffffff';
    ctx.shadowBlur = isTip ? 16 : 6;
    ctx.fill();
  });

  ctx.restore();
}

function drawRestingHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
