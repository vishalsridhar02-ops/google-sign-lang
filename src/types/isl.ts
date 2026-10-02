export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface HandFrame {
  timestamp: number;
  landmarks: Landmark3D[];
  handedness?: 'Left' | 'Right' | 'Unknown';
}

export interface SignSample {
  id: string;
  sampleIndex: number;
  recordedAt: string;
  frames: HandFrame[];
  durationMs: number;
  featureVector?: number[]; // summary features for rapid classification
}

export interface SignDefinition {
  id: string;
  label: string;
  englishGloss: string;
  englishMeaning: string;
  category: 'Greetings' | 'Emergency & Help' | 'Everyday' | 'Hackathon & Campus' | 'Questions' | 'Custom';
  description: string;
  instructions: string[];
  minExamplesRequired: number; // default: 3
  samples: SignSample[];
  isBuiltIn: boolean;
  color?: string;
  iconName?: string;
  // Procedural keyframe points for avatar demonstration
  avatarKeyframes?: {
    handLeft?: Landmark3D[];
    handRight: Landmark3D[];
    poseLabel?: string;
    motionDescription?: string;
  }[];
}

export interface LiveRecognitionMatch {
  label: string;
  confidence: number; // 0 to 1
  matchedSignId: string;
  matchedSampleId?: string;
  timestamp: number;
  featuresSummary?: string;
}

export interface ConversationTurn {
  id: string;
  sender: 'deaf_signer' | 'hearing_speaker';
  timestamp: number;
  rawInput: string; // e.g. glosses "NAMASTE HELP NEED" or spoken speech "Where is the main stage?"
  aiOutput: string; // e.g. natural sentence "Hello, I need some help, please." or ISL glosses
  detectedGlosses?: string[];
  confidence?: number;
  expression?: string;
  audioPlayed?: boolean;
}

export type KioskLayout = 'split' | 'overlay';
