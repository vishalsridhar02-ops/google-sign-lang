import React, { useEffect, useRef, useState } from 'react';
import { Landmark3D } from '../types/isl';
import { HAND_CONNECTIONS } from '../services/handTracker';
import { SEED_ISL_SIGNS } from '../data/seedCorpus';

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

      setTimeout(playNext, 1800); // 1.8s per sign
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

      // Dark futuristic booth background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw Upper Body Silhouette (Head, Neck, Torso, Shoulders)
      const cx = w / 2;
      const headY = h * 0.28;
      const headR = 38;

      // Shoulders & Torso
      ctx.fillStyle = '#1e1b4b'; // Deep indigo
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 90, h * 0.62);
      ctx.bezierCurveTo(cx - 70, h * 0.44, cx - 30, h * 0.40, cx, h * 0.40);
      ctx.bezierCurveTo(cx + 30, h * 0.40, cx + 70, h * 0.44, cx + 90, h * 0.62);
      ctx.lineTo(cx + 100, h);
      ctx.lineTo(cx - 100, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.fillStyle = '#312e81';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Facial Expression Eyes & Mouth
      ctx.fillStyle = '#c7d2fe';
      ctx.strokeStyle = '#c7d2fe';
      ctx.lineWidth = 2.5;

      const eyeY = headY - 4;
      const eyeOffset = 12;

      // Expression morphing
      if (expression === 'QUESTION') {
        // One raised eyebrow, curious mouth
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 3, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Question mouth (slight circle "O")
        ctx.beginPath();
        ctx.ellipse(cx, headY + 16, 5, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (expression === 'WELCOMING' || expression === 'THANKFUL') {
        // Smiling eyes (curves)
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 5, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + eyeOffset, eyeY, 5, Math.PI, 0);
        ctx.stroke();

        // Gentle warm smile
        ctx.beginPath();
        ctx.arc(cx, headY + 12, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      } else if (expression === 'URGENT') {
        // Tense eyes
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 4, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Flat serious mouth
        ctx.beginPath();
        ctx.moveTo(cx - 10, headY + 16);
        ctx.lineTo(cx + 10, headY + 16);
        ctx.stroke();
      } else {
        // Neutral friendly
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, 3, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, headY + 14, 8, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      // Draw Dynamic Hand Gestures
      // Find matching seed sign for landmarks
      const currentSign = SEED_ISL_SIGNS.find(s => s.id === activeGloss || s.label.toUpperCase() === activeGloss.toUpperCase());
      const keyframe = currentSign?.avatarKeyframes?.[0];

      const t = (frame % 60) / 60; // 1-second pulse cycle
      const wave = Math.sin(t * Math.PI * 2);

      // Render Right Hand
      if (keyframe?.handRight) {
        drawAvatarHand(ctx, keyframe.handRight, w, h, wave, '#a855f7', 'Right');
      } else {
        // Resting / ready gesture
        drawRestingHand(ctx, cx + 55 + wave * 3, h * 0.68 + wave * 4, '#8b5cf6');
      }

      // Render Left Hand if two-handed sign
      if (keyframe?.handLeft) {
        drawAvatarHand(ctx, keyframe.handLeft, w, h, -wave, '#3b82f6', 'Left');
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
    <div className="relative flex flex-col items-center w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-purple-900/40 shadow-2xl">
      <div className="absolute top-3 left-4 z-10 flex items-center space-x-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
        </span>
        <span className="text-xs font-mono font-bold tracking-wider text-purple-300 uppercase">
          AI ISL Sign Avatar • {expression}
        </span>
      </div>

      {/* Main avatar canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={320}
        className="w-full h-full object-cover max-h-[380px]"
      />

      {/* Active Gloss Banner */}
      <div className="w-full bg-slate-900/90 border-t border-purple-800/40 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-purple-950 border border-purple-500/50 rounded-lg text-purple-200 font-bold font-mono text-sm tracking-wide shadow-inner">
            {activeGloss ? `ISL: ${activeGloss}` : 'Awaiting Speech...'}
          </div>
          <span className="text-xs text-slate-400">
            {glossSequence.length > 0 ? `Sign ${currentGlossIndex + 1} of ${glossSequence.length}` : 'Ready for speaker'}
          </span>
        </div>

        {/* Small sequence pills */}
        <div className="flex items-center space-x-1 overflow-x-auto max-w-[200px] py-1">
          {glossSequence.map((g, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold whitespace-nowrap transition-colors ${
                i === currentGlossIndex
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : i < currentGlossIndex
                  ? 'bg-slate-800 text-slate-400 line-through'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
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

// Helper: draw avatar hand landmarks
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
  ctx.shadowBlur = 10;

  const points = landmarks.map(p => ({
    x: p.x * w + (handedness === 'Right' ? waveOffset * 8 : -waveOffset * 8),
    y: p.y * h + waveOffset * 6,
    z: p.z,
  }));

  // Skeleton connections
  HAND_CONNECTIONS.forEach(([i, j]) => {
    if (points[i] && points[j]) {
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[j].x, points[j].y);
      ctx.stroke();
    }
  });

  // Joints
  points.forEach((p, idx) => {
    ctx.beginPath();
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    ctx.arc(p.x, p.y, isTip ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#f43f5e' : '#ffffff';
    ctx.shadowBlur = isTip ? 12 : 4;
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
