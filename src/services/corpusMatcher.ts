import { Landmark3D, HandFrame, SignSample, SignDefinition, LiveRecognitionMatch } from '../types/isl';
import { SEED_ISL_SIGNS } from '../data/seedCorpus';

const STORAGE_KEY = 'aavishkar_isl_corpus_v1';

// Normalize a single frame's 21 landmarks for translation & scale invariance
export function normalizeHandLandmarks(landmarks: Landmark3D[]): Landmark3D[] {
  if (!landmarks || landmarks.length < 21) return landmarks;

  const wrist = landmarks[0];
  // Calculate scale using distance between wrist (0) and middle MCP (9)
  const middleMcp = landmarks[9];
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const dz = (middleMcp.z || 0) - (wrist.z || 0);
  const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.15;

  return landmarks.map(pt => ({
    x: (pt.x - wrist.x) / scale,
    y: (pt.y - wrist.y) / scale,
    z: ((pt.z || 0) - (wrist.z || 0)) / scale,
  }));
}

// Compute finger curl status (0 = curled tight, 1 = fully extended)
export function getFingerExtensions(landmarks: Landmark3D[]): {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  pinky: number;
} {
  if (!landmarks || landmarks.length < 21) {
    return { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
  }

  const wrist = landmarks[0];

  const getExt = (tipIdx: number, mcpIdx: number) => {
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    const dTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const dMcpWrist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
    return Math.min(1, Math.max(0, (dTipWrist / (dMcpWrist * 1.8))));
  };

  return {
    thumb: getExt(4, 2),
    index: getExt(8, 5),
    middle: getExt(12, 9),
    ring: getExt(16, 13),
    pinky: getExt(20, 17),
  };
}

// Extract a compact feature vector from a single hand frame (30 dimensions)
export function extractFrameFeatures(landmarks: Landmark3D[]): number[] {
  const norm = normalizeHandLandmarks(landmarks);
  const ext = getFingerExtensions(landmarks);

  // Take normalized positions of key tips: thumb(4), index(8), middle(12), ring(16), pinky(20)
  const tipIndices = [4, 8, 12, 16, 20];
  const features: number[] = [
    ext.thumb,
    ext.index,
    ext.middle,
    ext.ring,
    ext.pinky,
  ];

  tipIndices.forEach(idx => {
    features.push(norm[idx].x, norm[idx].y, norm[idx].z);
  });

  // Relative distances between thumb and index tip (pinch check)
  const dThumbIndex = Math.hypot(norm[4].x - norm[8].x, norm[4].y - norm[8].y);
  const dIndexMiddle = Math.hypot(norm[8].x - norm[12].x, norm[8].y - norm[12].y);
  features.push(dThumbIndex, dIndexMiddle);

  return features;
}

// Distance between two frame feature vectors
function featureDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 100;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Dynamic Time Warping (DTW) distance between two sequences of frame features
export function computeSequenceDtw(seqA: number[][], seqB: number[][]): number {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return 999;

  // Window constraint
  const w = Math.max(Math.abs(n - m) + 2, 4);

  // DTW matrix
  const dtw: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - w);
    const jEnd = Math.min(m, i + w);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = featureDistance(seqA[i - 1], seqB[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // insertion
        dtw[i][j - 1],     // deletion
        dtw[i - 1][j - 1]  // match
      );
    }
  }

  const pathLength = Math.max(n, m);
  return dtw[n][m] / pathLength;
}

export class CorpusManager {
  private signs: Map<string, SignDefinition> = new Map();

  constructor() {
    this.loadCorpus();
  }

  public loadCorpus(): SignDefinition[] {
    // Start with seed signs
    SEED_ISL_SIGNS.forEach(sign => {
      this.signs.set(sign.id, { ...sign });
    });

    // Try loading custom signs from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: SignDefinition[] = JSON.parse(raw);
        stored.forEach(customSign => {
          this.signs.set(customSign.id, customSign);
        });
      }
    } catch (e) {
      console.warn('Failed to load corpus from localStorage:', e);
    }

    return this.getAllSigns();
  }

  public getAllSigns(): SignDefinition[] {
    return Array.from(this.signs.values());
  }

  public getSign(id: string): SignDefinition | undefined {
    return this.signs.get(id);
  }

  public saveCorpus(): void {
    try {
      const customOnly = this.getAllSigns().filter(s => !s.isBuiltIn);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));

      // Also background sync to backend
      fetch('/api/corpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signs: customOnly }),
      }).catch(err => console.debug('Corpus backend sync not available:', err));
    } catch (e) {
      console.warn('Failed to save corpus to localStorage:', e);
    }
  }

  public addOrUpdateSign(sign: SignDefinition): void {
    this.signs.set(sign.id, sign);
    this.saveCorpus();
  }

  public deleteSign(id: string): boolean {
    const existing = this.signs.get(id);
    if (!existing || existing.isBuiltIn) return false;
    this.signs.delete(id);
    this.saveCorpus();
    return true;
  }

  public addSampleToSign(signId: string, frames: HandFrame[], durationMs: number): SignDefinition | null {
    const sign = this.signs.get(signId);
    if (!sign) return null;

    const sampleIndex = sign.samples.length + 1;
    const newSample: SignSample = {
      id: `${signId}-sample-${Date.now()}-${sampleIndex}`,
      sampleIndex,
      recordedAt: new Date().toISOString(),
      frames,
      durationMs,
    };

    sign.samples.push(newSample);
    this.signs.set(signId, sign);
    this.saveCorpus();
    return sign;
  }

  // Live matching engine: Match a sequence of recent frames against all eligible signs
  public recognizeSequence(liveFrames: HandFrame[]): LiveRecognitionMatch | null {
    if (!liveFrames || liveFrames.length < 5) return null;

    // Resample live frames into 12-15 representative feature vectors
    const targetLength = 12;
    const step = Math.max(1, Math.floor(liveFrames.length / targetLength));
    const liveFeatures: number[][] = [];

    for (let i = 0; i < liveFrames.length && liveFeatures.length < targetLength; i += step) {
      if (liveFrames[i].landmarks && liveFrames[i].landmarks.length >= 21) {
        liveFeatures.push(extractFrameFeatures(liveFrames[i].landmarks));
      }
    }

    if (liveFeatures.length < 4) return null;

    let bestMatch: LiveRecognitionMatch | null = null;
    let minDistance = Infinity;

    // Evaluate against each sign that has at least minExamplesRequired (e.g. 3 examples)
    this.signs.forEach(sign => {
      // Must meet minimum example requirement (3 examples per prompt requirement)
      if (sign.samples.length < (sign.minExamplesRequired || 3)) {
        return;
      }

      // Check against each sample of this sign
      let sampleDistances: number[] = [];

      sign.samples.forEach(sample => {
        if (!sample.frames || sample.frames.length < 4) return;

        // Sample features
        const sampleStep = Math.max(1, Math.floor(sample.frames.length / targetLength));
        const sampleFeatures: number[][] = [];
        for (let j = 0; j < sample.frames.length && sampleFeatures.length < targetLength; j += sampleStep) {
          if (sample.frames[j].landmarks && sample.frames[j].landmarks.length >= 21) {
            sampleFeatures.push(extractFrameFeatures(sample.frames[j].landmarks));
          }
        }

        if (sampleFeatures.length >= 4) {
          const dtw = computeSequenceDtw(liveFeatures, sampleFeatures);
          sampleDistances.push(dtw);
        }
      });

      if (sampleDistances.length > 0) {
        // Use average of top 2 closest samples for robustness
        sampleDistances.sort((a, b) => a - b);
        const topDist = sampleDistances[0];
        const effectiveDist = sampleDistances.length > 1
          ? (topDist * 0.7 + sampleDistances[1] * 0.3)
          : topDist;

        if (effectiveDist < minDistance) {
          minDistance = effectiveDist;
          // Distance scale: 0 to ~3.0. Convert to confidence percentage
          // e.g. dist 0.4 -> 90%, dist 0.8 -> 75%, dist 1.5 -> 50%
          const confidence = Math.max(0, Math.min(0.98, 1 - (effectiveDist / 2.2)));

          bestMatch = {
            label: sign.label,
            confidence: Number(confidence.toFixed(2)),
            matchedSignId: sign.id,
            timestamp: Date.now(),
            featuresSummary: `${sign.samples.length} trained examples | DTW dist: ${effectiveDist.toFixed(2)}`,
          };
        }
      }
    });

    return bestMatch;
  }
}

export const corpusManager = new CorpusManager();
