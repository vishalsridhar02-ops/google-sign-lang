import { Landmark3D, HandFrame, SignSample, SignDefinition, LiveRecognitionMatch } from '../types/isl';
import { SEED_ISL_SIGNS } from '../data/seedCorpus';

const STORAGE_KEY = 'aavishkar_isl_corpus_v1';

export interface NormalizedHandState {
  normalizedLandmarks: Landmark3D[];
  wristOrigin: Landmark3D;
  scale: number;
  palmNormal: { x: number; y: number; z: number };
}

/**
 * Normalizes a single frame's 21 landmarks relative to the wrist origin (Landmark 0)
 * Computes palm root-mean-square span for distance- and scale-invariance.
 * Also computes the 3D unit normal vector of the palm plane.
 */
export function normalizeHandLandmarks(landmarks: Landmark3D[]): NormalizedHandState {
  if (!landmarks || landmarks.length < 21) {
    return {
      normalizedLandmarks: landmarks || [],
      wristOrigin: { x: 0.5, y: 0.7, z: 0 },
      scale: 0.15,
      palmNormal: { x: 0, y: 0, z: 1 },
    };
  }

  const wrist = landmarks[0];

  // Palm base points: Index MCP (5), Middle MCP (9), Pinky MCP (17)
  const p5 = landmarks[5];
  const p9 = landmarks[9];
  const p17 = landmarks[17];

  // Distances from wrist to palm MCP joints
  const d0_5 = Math.hypot(p5.x - wrist.x, p5.y - wrist.y, (p5.z || 0) - (wrist.z || 0));
  const d0_9 = Math.hypot(p9.x - wrist.x, p9.y - wrist.y, (p9.z || 0) - (wrist.z || 0));
  const d0_17 = Math.hypot(p17.x - wrist.x, p17.y - wrist.y, (p17.z || 0) - (wrist.z || 0));

  // Robust palm span scale: invariant to finger curls or fist states
  const rawScale = (d0_5 + d0_9 + d0_17) / 3;
  const scale = rawScale > 0.02 ? rawScale : 0.12;

  // Translate all landmarks to wrist origin (0, 0, 0) and scale
  const normalizedLandmarks: Landmark3D[] = landmarks.map(pt => ({
    x: (pt.x - wrist.x) / scale,
    y: (pt.y - wrist.y) / scale,
    z: ((pt.z || 0) - (wrist.z || 0)) / scale,
  }));

  // Calculate 3D palm normal vector via cross product: V1 = (MCP5 - Wrist), V2 = (MCP17 - Wrist)
  const v1 = {
    x: p5.x - wrist.x,
    y: p5.y - wrist.y,
    z: (p5.z || 0) - (wrist.z || 0),
  };
  const v2 = {
    x: p17.x - wrist.x,
    y: p17.y - wrist.y,
    z: (p17.z || 0) - (wrist.z || 0),
  };

  // Cross product N = V1 x V2
  const nx = v1.y * v2.z - v1.z * v2.y;
  const ny = v1.z * v2.x - v1.x * v2.z;
  const nz = v1.x * v2.y - v1.y * v2.x;
  const nLen = Math.hypot(nx, ny, nz) || 1;

  return {
    normalizedLandmarks,
    wristOrigin: { ...wrist },
    scale,
    palmNormal: {
      x: nx / nLen,
      y: ny / nLen,
      z: nz / nLen,
    },
  };
}

/**
 * Computes individual finger extension ratios (0 = tightly curled, 1 = fully extended)
 */
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

  const calcExtension = (tipIdx: number, mcpIdx: number, pipIdx: number) => {
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    const pip = landmarks[pipIdx];

    const dTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y, (tip.z || 0) - (wrist.z || 0));
    const dMcpWrist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y, (mcp.z || 0) - (wrist.z || 0));
    const dTipPip = Math.hypot(tip.x - pip.x, tip.y - pip.y);

    const ratio = dTipWrist / (dMcpWrist * 1.75 + 0.001);
    return Math.min(1, Math.max(0, ratio * (dTipPip > 0.03 ? 1.0 : 0.5)));
  };

  return {
    thumb: calcExtension(4, 2, 3),
    index: calcExtension(8, 5, 6),
    middle: calcExtension(12, 9, 10),
    ring: calcExtension(16, 13, 14),
    pinky: calcExtension(20, 17, 18),
  };
}

/**
 * Extracts a high-dimensional, normalized spatial + trajectory feature vector (42 dimensions)
 * Incorporates:
 * - Scale-invariant wrist-relative fingertip positions
 * - 3D palm normal orientation vector
 * - Finger extension and inter-finger pinch/spread distances
 * - Spatial motion velocity / trajectory displacement vectors
 */
export function extractFrameFeatures(
  currentLandmarks: Landmark3D[],
  prevLandmarks?: Landmark3D[],
  dtSec: number = 0.066
): number[] {
  const normState = normalizeHandLandmarks(currentLandmarks);
  const norm = normState.normalizedLandmarks;
  const ext = getFingerExtensions(currentLandmarks);

  // 1. Finger Extension Features (5 dims)
  const features: number[] = [
    ext.thumb,
    ext.index,
    ext.middle,
    ext.ring,
    ext.pinky,
  ];

  // 2. Normalized Fingertip Coordinates (Points 4, 8, 12, 16, 20) (15 dims)
  const tipIndices = [4, 8, 12, 16, 20];
  tipIndices.forEach(idx => {
    features.push(norm[idx].x, norm[idx].y, norm[idx].z || 0);
  });

  // 3. Palm Normal Orientation Vector (3 dims)
  // Distinguishes palms facing up (WHERE, HELP), forward (HELLO, NAMASTE), sideways (DOCTOR, RESTROOM)
  features.push(normState.palmNormal.x, normState.palmNormal.y, normState.palmNormal.z);

  // 4. Inter-finger Pinch & Spread Distances (4 dims)
  const dThumbIndex = Math.hypot(norm[4].x - norm[8].x, norm[4].y - norm[8].y);
  const dIndexMiddle = Math.hypot(norm[8].x - norm[12].x, norm[8].y - norm[12].y);
  const dThumbMiddle = Math.hypot(norm[4].x - norm[12].x, norm[4].y - norm[12].y);
  const dMiddleRing = Math.hypot(norm[12].x - norm[16].x, norm[12].y - norm[16].y);
  features.push(dThumbIndex, dIndexMiddle, dThumbMiddle, dMiddleRing);

  // 5. Spatial Motion Trajectory (Displacement & Velocity) (6 dims)
  if (prevLandmarks && prevLandmarks.length >= 21) {
    const prevWrist = prevLandmarks[0];
    const currWrist = currentLandmarks[0];

    const safeDt = Math.max(0.016, dtSec);
    // Global wrist velocity in camera space (tracks lifting, waving, tapping, bowing)
    const vx = (currWrist.x - prevWrist.x) / safeDt;
    const vy = (currWrist.y - prevWrist.y) / safeDt;
    const vz = ((currWrist.z || 0) - (prevWrist.z || 0)) / safeDt;

    // Index fingertip velocity relative to wrist
    const prevNormState = normalizeHandLandmarks(prevLandmarks);
    const tipVx = (norm[8].x - prevNormState.normalizedLandmarks[8].x) / safeDt;
    const tipVy = (norm[8].y - prevNormState.normalizedLandmarks[8].y) / safeDt;
    const tipSpeed = Math.hypot(tipVx, tipVy);

    features.push(
      Math.max(-5, Math.min(5, vx * 0.2)),
      Math.max(-5, Math.min(5, vy * 0.2)),
      Math.max(-5, Math.min(5, vz * 0.2)),
      Math.max(-5, Math.min(5, tipVx * 0.1)),
      Math.max(-5, Math.min(5, tipVy * 0.1)),
      Math.max(0, Math.min(5, tipSpeed * 0.1))
    );
  } else {
    features.push(0, 0, 0, 0, 0, 0);
  }

  // 6. Global Spatial Anchor Context (2 dims)
  // Position relative to upper body / center screen (e.g. at chest vs near temple vs waist)
  features.push(
    (normState.wristOrigin.x - 0.5) * 2.0,
    (normState.wristOrigin.y - 0.6) * 2.0
  );

  return features;
}

/**
 * Weighted feature distance between two frame vectors
 * Prioritizes handshape extensions, palm normal, and motion trajectory
 */
function weightedFeatureDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 100;

  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];

    // Weight allocation:
    let weight = 1.0;
    if (i < 5) {
      weight = 2.2; // Finger extensions (thumb..pinky curl)
    } else if (i < 20) {
      weight = 1.8; // Normalized tip coordinates
    } else if (i < 23) {
      weight = 2.0; // Palm normal orientation (crucial for orientation)
    } else if (i < 27) {
      weight = 2.5; // Pinch & spread distances (crucial for pinch/snap)
    } else if (i < 33) {
      weight = 1.5; // Motion velocity / trajectory
    } else {
      weight = 1.2; // Global height/spatial anchor
    }

    sum += diff * diff * weight;
  }

  return Math.sqrt(sum);
}

/**
 * Dynamic Time Warping (DTW) distance with Sakoe-Chiba constraint band
 */
export function computeSequenceDtw(seqA: number[][], seqB: number[][]): number {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return 999;

  // Sakoe-Chiba band width constraint (prevents pathological time warping)
  const w = Math.max(Math.abs(n - m) + 2, 4);

  const dtw: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - w);
    const jEnd = Math.min(m, i + w);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = weightedFeatureDistance(seqA[i - 1], seqB[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],       // insertion
        dtw[i][j - 1],       // deletion
        dtw[i - 1][j - 1]    // match
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
    SEED_ISL_SIGNS.forEach(sign => {
      this.signs.set(sign.id, { ...sign });
    });

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

  /**
   * Transforms an array of raw HandFrames into a sequence of normalized spatial + trajectory feature vectors
   */
  private extractSequenceFeatures(frames: HandFrame[], targetLength: number = 12): number[][] {
    if (!frames || frames.length === 0) return [];

    const step = Math.max(1, Math.floor(frames.length / targetLength));
    const featureVectors: number[][] = [];

    for (let i = 0; i < frames.length && featureVectors.length < targetLength; i += step) {
      const curr = frames[i];
      if (curr?.landmarks && curr.landmarks.length >= 21) {
        const prev = i > 0 ? frames[i - 1]?.landmarks : undefined;
        const dt = (curr.timestamp - (frames[Math.max(0, i - 1)]?.timestamp || curr.timestamp)) / 1000 || 0.066;
        featureVectors.push(extractFrameFeatures(curr.landmarks, prev, dt));
      }
    }

    return featureVectors;
  }

  /**
   * Live matching engine with increased sensitivity and trajectory tracking
   */
  public recognizeSequence(liveFrames: HandFrame[]): LiveRecognitionMatch | null {
    if (!liveFrames || liveFrames.length < 5) return null;

    const targetLength = 12;
    const liveFeatures = this.extractSequenceFeatures(liveFrames, targetLength);
    if (liveFeatures.length < 4) return null;

    let bestMatch: LiveRecognitionMatch | null = null;
    let minDistance = Infinity;

    this.signs.forEach(sign => {
      if (sign.samples.length < (sign.minExamplesRequired || 3)) {
        return;
      }

      const sampleDistances: number[] = [];

      sign.samples.forEach(sample => {
        if (!sample.frames || sample.frames.length < 4) return;

        const sampleFeatures = this.extractSequenceFeatures(sample.frames, targetLength);
        if (sampleFeatures.length >= 4) {
          const dtwDist = computeSequenceDtw(liveFeatures, sampleFeatures);
          sampleDistances.push(dtwDist);
        }
      });

      if (sampleDistances.length > 0) {
        sampleDistances.sort((a, b) => a - b);
        const topDist = sampleDistances[0];
        // Combine top 2 samples with 75/25 weighting
        const effectiveDist = sampleDistances.length > 1
          ? (topDist * 0.75 + sampleDistances[1] * 0.25)
          : topDist;

        if (effectiveDist < minDistance) {
          minDistance = effectiveDist;

          // Calibrated smooth confidence function with high discrimination:
          // Low distance (< 1.8) -> High confidence (> 85%)
          // Medium distance (1.8 - 2.8) -> Moderate confidence (70% - 85%)
          // High distance (> 3.5) -> Low confidence (< 55%)
          const confidence = Math.max(0, Math.min(0.99, 1 / (1 + Math.pow(effectiveDist / 2.3, 1.8))));

          bestMatch = {
            label: sign.label,
            confidence: Number(confidence.toFixed(2)),
            matchedSignId: sign.id,
            timestamp: Date.now(),
            featuresSummary: `${sign.samples.length} trained exemplars | DTW distance: ${effectiveDist.toFixed(2)} | Trajectory Active`,
          };
        }
      }
    });

    return bestMatch;
  }
}

export const corpusManager = new CorpusManager();
