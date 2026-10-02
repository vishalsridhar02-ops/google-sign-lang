import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Landmark3D, HandFrame } from '../types/isl';

export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

export class HandTrackingEngine {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing: boolean = false;
  private initError: string | null = null;

  public async initialize(): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      // Use official Google MediaPipe wasm binary assets
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.isInitializing = false;
        return true;
      } catch (gpuErr) {
        console.warn('MediaPipe GPU initialization failed, attempting CPU fallback:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
        this.isInitializing = false;
        return true;
      }
    } catch (err: any) {
      this.initError = err?.message || 'MediaPipe initialization failed';
      this.isInitializing = false;
      console.warn('MediaPipe initialization warning (fallback gesture simulation active):', err);
      return false;
    }
  }

  public detectHands(video: HTMLVideoElement, timestampMs: number): HandFrame[] {
    if (!this.handLandmarker || !video || video.readyState < 2) {
      return [];
    }

    try {
      const results = this.handLandmarker.detectForVideo(video, timestampMs);
      if (!results || !results.landmarks || results.landmarks.length === 0) {
        return [];
      }

      return results.landmarks.map((handPts, idx) => {
        const handedness = results.handednesses?.[idx]?.[0]?.categoryName as 'Left' | 'Right' | undefined;
        return {
          timestamp: timestampMs,
          landmarks: handPts.map(pt => ({
            x: pt.x,
            y: pt.y,
            z: pt.z || 0,
          })),
          handedness: handedness || 'Right',
        };
      });
    } catch (e) {
      return [];
    }
  }

  public drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark3D[],
    width: number,
    height: number,
    color = '#8b5cf6', // Aavishkar purple
    handedness = 'Right'
  ): void {
    if (!landmarks || landmarks.length < 21) return;

    // Draw connecting skeleton bones
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // Draw individual joints
    landmarks.forEach((p, index) => {
      const px = p.x * width;
      const py = p.y * height;
      const isFingertip = [4, 8, 12, 16, 20].includes(index);
      const isWrist = index === 0;

      ctx.beginPath();
      ctx.arc(px, py, isFingertip ? 6 : isWrist ? 7 : 4, 0, 2 * Math.PI);

      if (isFingertip) {
        ctx.fillStyle = '#f43f5e'; // pink/red highlight for fingertips
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
      } else if (isWrist) {
        ctx.fillStyle = '#06b6d4'; // cyan wrist
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
      }

      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw handedness label near wrist
    const wrist = landmarks[0];
    ctx.shadowBlur = 0;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `${handedness} Hand`,
      wrist.x * width + 10,
      wrist.y * height - 8
    );
  }
}

export const handTracker = new HandTrackingEngine();
