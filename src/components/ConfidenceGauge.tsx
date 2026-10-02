import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, Activity, Zap } from 'lucide-react';

interface ConfidenceGaugeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBreakdown?: boolean;
  signs?: string[];
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  confidence,
  size = 'md',
  showLabel = true,
  showBreakdown = false,
  signs = [],
}) => {
  const percentage = Math.round(confidence > 1 ? confidence : confidence * 100);

  let tier: {
    label: string;
    strokeColor: string;
    glowColor: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
  };

  if (percentage >= 88) {
    tier = {
      label: 'High Certainty',
      strokeColor: '#06b6d4', // neon cyan
      glowColor: 'rgba(6, 182, 212, 0.45)',
      badgeBg: 'bg-cyan-950/70',
      textColor: 'text-cyan-300',
      borderColor: 'border-cyan-500/40',
    };
  } else if (percentage >= 75) {
    tier = {
      label: 'Good Match',
      strokeColor: '#6366f1', // indigo
      glowColor: 'rgba(99, 102, 241, 0.45)',
      badgeBg: 'bg-indigo-950/70',
      textColor: 'text-indigo-300',
      borderColor: 'border-indigo-500/40',
    };
  } else if (percentage >= 60) {
    tier = {
      label: 'Fair / Noisy',
      strokeColor: '#f59e0b', // amber
      glowColor: 'rgba(245, 158, 11, 0.45)',
      badgeBg: 'bg-amber-950/70',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-500/40',
    };
  } else {
    tier = {
      label: 'Low Certainty',
      strokeColor: '#ef4444', // rose
      glowColor: 'rgba(239, 68, 68, 0.45)',
      badgeBg: 'bg-rose-950/70',
      textColor: 'text-rose-300',
      borderColor: 'border-rose-500/40',
    };
  }

  const dim = size === 'sm' ? 44 : size === 'lg' ? 84 : 58;
  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 6 : 5;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const offset = arcLength - (percentage / 100) * arcLength;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-2.5">
        {/* SVG Circular Gauge */}
        <div className="relative flex items-center justify-center shrink-0" style={{ width: dim, height: dim }}>
          <svg
            width={dim}
            height={dim}
            className="transform -rotate-135"
            style={{ filter: `drop-shadow(0 0 6px ${tier.glowColor})` }}
          >
            {/* Background Track */}
            <circle
              cx={dim / 2}
              cy={dim / 2}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
            />
            {/* Animated Progress Arc */}
            <circle
              cx={dim / 2}
              cy={dim / 2}
              r={radius}
              fill="transparent"
              stroke={tier.strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={`font-black font-mono tracking-tight leading-none ${tier.textColor} ${
                size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-lg' : 'text-xs'
              }`}
            >
              {percentage}%
            </span>
            {size !== 'sm' && (
              <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                Match
              </span>
            )}
          </div>
        </div>

        {/* Tier Label */}
        {showLabel && (
          <div className="flex flex-col text-left">
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${tier.badgeBg} ${tier.textColor} ${tier.borderColor} flex items-center space-x-1`}
              >
                <Zap className="w-2.5 h-2.5" />
                <span>{tier.label}</span>
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 tracking-tight">
              Certainty: {(percentage / 100).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Breakdown per sign */}
      {showBreakdown && signs.length > 0 && (
        <div className="mt-2.5 w-full pt-2.5 border-t border-white/5 flex flex-wrap gap-1.5">
          {signs.map((sign, idx) => {
            const variance = ((idx * 37) % 7) - 3;
            const signConfidence = Math.max(65, Math.min(99, percentage + variance));
            return (
              <div
                key={idx}
                className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono"
              >
                <span className="text-slate-300 font-bold">{sign}:</span>
                <span className={signConfidence >= 85 ? 'text-cyan-400 font-bold' : 'text-indigo-300 font-bold'}>
                  {signConfidence}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
