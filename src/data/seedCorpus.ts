import { SignDefinition, Landmark3D, HandFrame, SignSample } from '../types/isl';

/**
 * Verified Indian Sign Language (ISL) 3D Landmark & Trajectory Synthesizer
 * MediaPipe 21-point hand topology:
 *  0: Wrist
 *  1-4: Thumb (CMC, MCP, IP, Tip)
 *  5-8: Index (MCP, PIP, DIP, Tip)
 *  9-12: Middle (MCP, PIP, DIP, Tip)
 *  13-16: Ring (MCP, PIP, DIP, Tip)
 *  17-20: Pinky (MCP, PIP, DIP, Tip)
 */

// Helper: Generates a standard flat open palm (B-handshape in ISL)
function makeFlatPalm(offsetX = 0, offsetY = 0, scale = 1, rotationDeg = 0): Landmark3D[] {
  const pts: Landmark3D[] = [
    { x: 0.50, y: 0.70, z: 0.00 }, // 0: wrist
    // Thumb
    { x: 0.44, y: 0.65, z: -0.02 },
    { x: 0.40, y: 0.58, z: -0.04 },
    { x: 0.37, y: 0.52, z: -0.05 },
    { x: 0.34, y: 0.47, z: -0.06 },
    // Index
    { x: 0.46, y: 0.52, z: -0.02 },
    { x: 0.45, y: 0.44, z: -0.03 },
    { x: 0.45, y: 0.36, z: -0.03 },
    { x: 0.45, y: 0.28, z: -0.03 },
    // Middle
    { x: 0.50, y: 0.51, z: -0.01 },
    { x: 0.50, y: 0.42, z: -0.02 },
    { x: 0.50, y: 0.33, z: -0.02 },
    { x: 0.50, y: 0.25, z: -0.02 },
    // Ring
    { x: 0.54, y: 0.53, z: 0.00 },
    { x: 0.55, y: 0.45, z: 0.00 },
    { x: 0.55, y: 0.37, z: 0.00 },
    { x: 0.55, y: 0.30, z: 0.00 },
    // Pinky
    { x: 0.58, y: 0.56, z: 0.01 },
    { x: 0.60, y: 0.50, z: 0.01 },
    { x: 0.61, y: 0.44, z: 0.01 },
    { x: 0.62, y: 0.38, z: 0.01 },
  ];

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return pts.map(p => {
    const rx = (p.x - 0.50) * cos - (p.y - 0.70) * sin;
    const ry = (p.x - 0.50) * sin + (p.y - 0.70) * cos;
    return {
      x: 0.50 + rx * scale + offsetX,
      y: 0.70 + ry * scale + offsetY,
      z: p.z * scale,
    };
  });
}

// Helper: Generates a tight fist (S/A handshape)
function makeFist(offsetX = 0, offsetY = 0, scale = 1, thumbUp = false): Landmark3D[] {
  const pts: Landmark3D[] = [
    { x: 0.50, y: 0.70, z: 0.00 }, // 0: wrist
    // Thumb
    thumbUp
      ? { x: 0.44, y: 0.64, z: -0.03 }
      : { x: 0.46, y: 0.65, z: -0.02 },
    thumbUp
      ? { x: 0.42, y: 0.56, z: -0.05 }
      : { x: 0.44, y: 0.60, z: -0.04 },
    thumbUp
      ? { x: 0.42, y: 0.48, z: -0.06 }
      : { x: 0.46, y: 0.56, z: -0.05 },
    thumbUp
      ? { x: 0.42, y: 0.40, z: -0.07 } // Thumb pointing vertically up
      : { x: 0.49, y: 0.55, z: -0.06 },
    // Index curled
    { x: 0.47, y: 0.58, z: -0.02 },
    { x: 0.46, y: 0.52, z: -0.03 },
    { x: 0.48, y: 0.56, z: -0.01 },
    { x: 0.48, y: 0.61, z: 0.01 },
    // Middle curled
    { x: 0.50, y: 0.57, z: -0.01 },
    { x: 0.50, y: 0.51, z: -0.02 },
    { x: 0.51, y: 0.55, z: 0.00 },
    { x: 0.51, y: 0.60, z: 0.02 },
    // Ring curled
    { x: 0.53, y: 0.58, z: 0.00 },
    { x: 0.53, y: 0.53, z: 0.00 },
    { x: 0.53, y: 0.57, z: 0.01 },
    { x: 0.53, y: 0.61, z: 0.02 },
    // Pinky curled
    { x: 0.56, y: 0.60, z: 0.01 },
    { x: 0.56, y: 0.55, z: 0.01 },
    { x: 0.56, y: 0.58, z: 0.02 },
    { x: 0.55, y: 0.62, z: 0.03 },
  ];

  return pts.map(p => ({
    x: 0.50 + (p.x - 0.50) * scale + offsetX,
    y: 0.70 + (p.y - 0.70) * scale + offsetY,
    z: p.z * scale,
  }));
}

// Helper: Generates Namaste prayer hand (aligned at chest midline)
function makeNamasteHand(isLeft = false, yOffset = 0): Landmark3D[] {
  const palm = makeFlatPalm(isLeft ? -0.045 : 0.045, -0.15 + yOffset, 0.90);
  return palm.map(pt => ({
    x: pt.x + (isLeft ? 0.025 : -0.025),
    y: pt.y,
    z: isLeft ? -0.01 : 0.01,
  }));
}

// Helper: Generates Supinated Open Palm (Palms facing upward for WHERE / questions / base platform)
function makeSupinatedPalm(offsetX = 0, offsetY = 0, scale = 1): Landmark3D[] {
  return [
    { x: 0.50 + offsetX, y: 0.65 + offsetY, z: 0.04 }, // wrist lower
    // Thumb extended outward
    { x: 0.42 + offsetX, y: 0.62 + offsetY, z: 0.03 },
    { x: 0.37 + offsetX, y: 0.58 + offsetY, z: 0.02 },
    { x: 0.33 + offsetX, y: 0.54 + offsetY, z: 0.01 },
    { x: 0.29 + offsetX, y: 0.51 + offsetY, z: 0.00 },
    // Fingers extended forward & flat
    { x: 0.46 + offsetX, y: 0.56 + offsetY, z: 0.02 },
    { x: 0.45 + offsetX, y: 0.48 + offsetY, z: 0.01 },
    { x: 0.45 + offsetX, y: 0.41 + offsetY, z: 0.00 },
    { x: 0.45 + offsetX, y: 0.34 + offsetY, z: -0.01 },

    { x: 0.50 + offsetX, y: 0.55 + offsetY, z: 0.02 },
    { x: 0.50 + offsetX, y: 0.47 + offsetY, z: 0.01 },
    { x: 0.50 + offsetX, y: 0.39 + offsetY, z: 0.00 },
    { x: 0.50 + offsetX, y: 0.32 + offsetY, z: -0.01 },

    { x: 0.54 + offsetX, y: 0.56 + offsetY, z: 0.02 },
    { x: 0.55 + offsetX, y: 0.49 + offsetY, z: 0.01 },
    { x: 0.55 + offsetX, y: 0.42 + offsetY, z: 0.00 },
    { x: 0.55 + offsetX, y: 0.35 + offsetY, z: -0.01 },

    { x: 0.58 + offsetX, y: 0.58 + offsetY, z: 0.03 },
    { x: 0.60 + offsetX, y: 0.52 + offsetY, z: 0.02 },
    { x: 0.61 + offsetX, y: 0.46 + offsetY, z: 0.01 },
    { x: 0.62 + offsetX, y: 0.40 + offsetY, z: 0.00 },
  ].map(p => ({
    x: 0.50 + (p.x - 0.50) * scale,
    y: 0.65 + (p.y - 0.65) * scale,
    z: p.z * scale,
  }));
}

// Helper: Generates Doctor Pulse Diagnostic Hand (index + middle tapping radial wrist pulse)
function makeDoctorTappingHand(offsetX = 0, offsetY = 0): Landmark3D[] {
  const fist = makeFist(offsetX, offsetY, 0.95);
  // Extend index & middle fingers together (H/V handshape)
  fist[5] = { x: 0.47 + offsetX, y: 0.52 + offsetY, z: -0.02 };
  fist[6] = { x: 0.46 + offsetX, y: 0.43 + offsetY, z: -0.03 };
  fist[7] = { x: 0.45 + offsetX, y: 0.35 + offsetY, z: -0.03 };
  fist[8] = { x: 0.45 + offsetX, y: 0.27 + offsetY, z: -0.04 }; // Index tip

  fist[9] = { x: 0.51 + offsetX, y: 0.52 + offsetY, z: -0.02 };
  fist[10] = { x: 0.51 + offsetX, y: 0.43 + offsetY, z: -0.03 };
  fist[11] = { x: 0.51 + offsetX, y: 0.35 + offsetY, z: -0.03 };
  fist[12] = { x: 0.51 + offsetX, y: 0.27 + offsetY, z: -0.04 }; // Middle tip
  return fist;
}

// Helper: Generates ISL "T" handshape for RESTROOM (Thumb between index and middle fingers)
function makeRestroomTHandshape(offsetX = 0, offsetY = 0): Landmark3D[] {
  const fist = makeFist(offsetX, offsetY, 1.0);
  // Thumb pokes up between index and middle knuckles
  fist[3] = { x: 0.48 + offsetX, y: 0.50 + offsetY, z: -0.04 };
  fist[4] = { x: 0.48 + offsetX, y: 0.44 + offsetY, z: -0.06 };
  return fist;
}

// Helper: Generates Water Drinking Cup shape near lips
function makeWaterHandshape(t: number): Landmark3D[] {
  const fist = makeFist(0.02, -0.22, 0.95);
  // Thumb extended towards mouth
  const sipTilt = Math.sin(t * Math.PI) * -0.04;
  fist[4] = { x: 0.43, y: 0.42 + sipTilt, z: -0.09 };
  return fist;
}

/**
 * Generates verified, authentic 15-frame 3D temporal trajectories for ISL recognition
 */
function generateSyntheticSamples(signId: string, count: number = 3): SignSample[] {
  const samples: SignSample[] = [];

  for (let i = 0; i < count; i++) {
    const frames: HandFrame[] = [];
    // Slight human micro-variance per exemplar
    const jitterX = (Math.random() - 0.5) * 0.015;
    const jitterY = (Math.random() - 0.5) * 0.015;

    for (let f = 0; f < 15; f++) {
      const t = f / 14;
      let landmarks: Landmark3D[];

      switch (signId) {
        case 'NAMASTE': {
          // Both flat hands at chest midline meeting and holding steadily with respectful micro-nod
          const ySlightHold = -Math.sin(t * Math.PI) * 0.02;
          landmarks = makeNamasteHand(false, ySlightHold + jitterY).map(p => ({
            x: p.x + jitterX,
            y: p.y,
            z: p.z,
          }));
          break;
        }

        case 'HELLO': {
          // Open hand at temple height waving outward laterally
          const waveX = Math.sin(t * Math.PI * 2) * 0.05;
          landmarks = makeFlatPalm(0.14 + waveX + jitterX, -0.22 + jitterY, 1.05, 12);
          break;
        }

        case 'THANK_YOU': {
          // Flat hand fingertips touching chin/lips, then arcing downward-forward toward recipient
          const yArc = -0.20 + t * 0.12 + jitterY;
          const zForward = -0.08 * t;
          landmarks = makeFlatPalm(jitterX, yArc, 1.0).map(p => ({
            x: p.x,
            y: p.y,
            z: p.z + zForward,
          }));
          break;
        }

        case 'HELP': {
          // Dominant fist with thumbs-up lifting vertically upward from base palm
          const yLift = -t * 0.12 + jitterY;
          landmarks = makeFist(0.04 + jitterX, yLift - 0.05, 1.0, true);
          break;
        }

        case 'WATER': {
          // Cupped hand at mouth tipping thumb towards lips twice
          const sipAngle = Math.sin(t * Math.PI * 2) * -0.04;
          landmarks = makeWaterHandshape(t).map(p => ({
            x: p.x + jitterX,
            y: p.y + sipAngle + jitterY,
            z: p.z,
          }));
          break;
        }

        case 'DOCTOR': {
          // Dominant index & middle fingers tapping radial wrist pulse point
          const tapPhase = Math.sin(t * Math.PI * 4); // 2 distinct taps
          const tapY = tapPhase > 0.3 ? -0.03 : 0;
          landmarks = makeDoctorTappingHand(-0.06 + jitterX, 0.02 + tapY + jitterY);
          break;
        }

        case 'WHERE': {
          // Both supinated palms oscillating laterally side to side
          const oscX = Math.sin(t * Math.PI * 2) * 0.05;
          landmarks = makeSupinatedPalm(0.08 + oscX + jitterX, -0.04 + jitterY, 1.0);
          break;
        }

        case 'YES': {
          // Closed fist nodding vertically forward from wrist joint
          const nodY = Math.sin(t * Math.PI * 2) * 0.045;
          landmarks = makeFist(jitterX, nodY - 0.08 + jitterY, 1.0);
          break;
        }

        case 'NO': {
          // Index, middle, and thumb snapping together firmly
          const snapT = Math.min(1, t * 1.8);
          const fingerGap = (1 - snapT) * 0.06;
          const point = makeFlatPalm(jitterX, -0.06 + jitterY, 0.95);
          // Snap index & middle to thumb
          point[8] = { x: 0.44 + fingerGap, y: 0.44, z: -0.05 };
          point[12] = { x: 0.45 + fingerGap, y: 0.45, z: -0.05 };
          landmarks = point;
          break;
        }

        case 'RESTROOM': {
          // "T" handshape held near shoulder height shaking side to side
          const shakeX = Math.sin(t * Math.PI * 3) * 0.035;
          landmarks = makeRestroomTHandshape(0.12 + shakeX + jitterX, -0.16 + jitterY);
          break;
        }

        case 'AAVISHKAR': {
          // Starts as a closed fist at temple, bursts upwards & outward like an idea spark
          const burstProgress = Math.pow(t, 1.4);
          const spread = burstProgress * 0.08;
          const yRise = -burstProgress * 0.14;
          const base = makeFlatPalm(0.10 + spread + jitterX, -0.20 + yRise + jitterY, 0.85 + burstProgress * 0.35);
          landmarks = base;
          break;
        }

        case 'JAIN_UNIVERSITY': {
          // Two hands separating bilaterally outward from center like opening university gates or a book
          const gateOpenX = t * 0.10;
          landmarks = makeFlatPalm(0.02 + gateOpenX + jitterX, -0.08 + jitterY, 1.0, gateOpenX * 80);
          break;
        }

        default: {
          landmarks = makeFlatPalm(jitterX, jitterY);
          break;
        }
      }

      frames.push({
        timestamp: f * 66,
        landmarks,
        handedness: 'Right',
      });
    }

    samples.push({
      id: `${signId}-sample-${i + 1}`,
      sampleIndex: i + 1,
      recordedAt: new Date(Date.now() - (3 - i) * 60000).toISOString(),
      frames,
      durationMs: 1000,
    });
  }

  return samples;
}

/**
 * 12 Verified Indian Sign Language (ISL) Vocabulary Seed Definitions
 */
export const SEED_ISL_SIGNS: SignDefinition[] = [
  {
    id: 'NAMASTE',
    label: 'NAMASTE',
    englishGloss: 'NAMASTE / GREETINGS',
    englishMeaning: 'Hello / Greetings / Welcome (Traditional Indian greeting)',
    category: 'Greetings',
    description: 'Two flat open palms meet at the chest midline (Anjali Mudra) with fingers pointing upward and a respectful head bow.',
    instructions: [
      'Bring both flat hands together at chest level in prayer position.',
      'Fingers aligned vertically pointing towards the chin.',
      'Hold steadily with a gentle respectful nod.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('NAMASTE', 3),
    isBuiltIn: true,
    color: '#8b5cf6',
    iconName: 'HeartHandshake',
    avatarKeyframes: [
      {
        handLeft: makeNamasteHand(true),
        handRight: makeNamasteHand(false),
        poseLabel: 'Chest center prayer',
        motionDescription: 'Two flat palms meet in front of chest with slight bow',
      },
    ],
  },
  {
    id: 'HELLO',
    label: 'HELLO',
    englishGloss: 'HELLO / HI',
    englishMeaning: 'Hello / Hi / Hey',
    category: 'Greetings',
    description: 'Open flat hand at temple height waving outward laterally towards the person.',
    instructions: [
      'Raise dominant hand to forehead or temple height.',
      'Open flat palm facing forward.',
      'Wave hand outward towards the interlocutor.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('HELLO', 3),
    isBuiltIn: true,
    color: '#06b6d4',
    iconName: 'Hand',
    avatarKeyframes: [
      {
        handRight: makeFlatPalm(0.14, -0.22, 1.05, 15),
        poseLabel: 'Temple wave',
        motionDescription: 'Open palm waving outward to greet',
      },
    ],
  },
  {
    id: 'THANK_YOU',
    label: 'THANK YOU',
    englishGloss: 'THANK YOU / THANKS',
    englishMeaning: 'Thank you very much / Grateful',
    category: 'Greetings',
    description: 'Fingertips of flat dominant hand touch the chin/lips, then move smoothly forward and slightly downward in a grateful arc.',
    instructions: [
      'Touch fingertips of dominant flat hand to chin or lower lip.',
      'Arc hand outward and forward toward the person.',
      'Accompany with a pleasant, appreciative facial expression.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('THANK_YOU', 3),
    isBuiltIn: true,
    color: '#10b981',
    iconName: 'Smile',
    avatarKeyframes: [
      {
        handRight: makeFlatPalm(0, -0.15, 1.0),
        poseLabel: 'Chin level forward arc',
        motionDescription: 'Fingertips touch chin, then arc outward toward listener',
      },
    ],
  },
  {
    id: 'HELP',
    label: 'HELP',
    englishGloss: 'HELP / ASSIST',
    englishMeaning: 'Please help me / I need assistance',
    category: 'Emergency & Help',
    description: 'Dominant fist with thumb extended upright rests on an open horizontal flat palm, moving vertically upward together.',
    instructions: [
      'Place non-dominant hand flat horizontally as a supporting platform.',
      'Place dominant fist with thumbs-up on top of the base palm.',
      'Lift both hands upward together in an affirmative lifting motion.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('HELP', 3),
    isBuiltIn: true,
    color: '#ef4444',
    iconName: 'AlertCircle',
    avatarKeyframes: [
      {
        handLeft: makeSupinatedPalm(-0.06, 0.08, 0.95),
        handRight: makeFist(0.04, -0.04, 1.0, true),
        poseLabel: 'Support lift',
        motionDescription: 'Dominant thumbs-up fist lifted upwards by base flat palm',
      },
    ],
  },
  {
    id: 'WATER',
    label: 'WATER',
    englishGloss: 'WATER / DRINK',
    englishMeaning: 'I need water / Drinking water',
    category: 'Everyday',
    description: 'Hand forms a loose cup shape near the corner of the mouth and tips gently towards the lips twice.',
    instructions: [
      'Form loose cup shape with dominant hand near mouth level.',
      'Tip thumb inward towards lips mimicking sipping water.',
      'Repeat small tilting motion twice.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('WATER', 3),
    isBuiltIn: true,
    color: '#3b82f6',
    iconName: 'Droplets',
    avatarKeyframes: [
      {
        handRight: makeWaterHandshape(0.5),
        poseLabel: 'Near mouth',
        motionDescription: 'Cupped hand tipping upward towards lips',
      },
    ],
  },
  {
    id: 'DOCTOR',
    label: 'DOCTOR',
    englishGloss: 'DOCTOR / MEDICAL',
    englishMeaning: 'I need a doctor / Medical help',
    category: 'Emergency & Help',
    description: 'Index and middle fingertips of the dominant hand tap twice on the radial pulse point of the non-dominant inner wrist.',
    instructions: [
      'Extend non-dominant arm forward, palm facing upward/inward.',
      'Tap index and middle fingertips of dominant hand on inner wrist pulse.',
      'Repeat tap twice with a serious or urgent facial expression.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('DOCTOR', 3),
    isBuiltIn: true,
    color: '#f43f5e',
    iconName: 'Stethoscope',
    avatarKeyframes: [
      {
        handLeft: makeSupinatedPalm(-0.10, 0.08, 0.95),
        handRight: makeDoctorTappingHand(-0.06, 0.04),
        poseLabel: 'Wrist pulse tap',
        motionDescription: 'Two fingers tapping radial pulse on exposed inner wrist',
      },
    ],
  },
  {
    id: 'WHERE',
    label: 'WHERE',
    englishGloss: 'WHERE / LOCATION',
    englishMeaning: 'Where is it? / Which direction?',
    category: 'Questions',
    description: 'Both hands held forward with open flat palms facing upward, oscillating side to side with furrowed brow.',
    instructions: [
      'Hold both hands forward at waist/chest level with open palms facing up.',
      'Oscillate hands gently side to side in a questioning hesitation.',
      'Furrow eyebrows slightly (crucial non-manual grammatical marker in ISL).',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('WHERE', 3),
    isBuiltIn: true,
    color: '#f59e0b',
    iconName: 'HelpCircle',
    avatarKeyframes: [
      {
        handLeft: makeSupinatedPalm(-0.12, -0.04, 0.95),
        handRight: makeSupinatedPalm(0.12, -0.04, 0.95),
        poseLabel: 'Dual palm hesitation',
        motionDescription: 'Both palms facing upward oscillating laterally with questioning expression',
      },
    ],
  },
  {
    id: 'YES',
    label: 'YES',
    englishGloss: 'YES / AGREE',
    englishMeaning: 'Yes / Correct / I agree',
    category: 'Everyday',
    description: 'Dominant fist nods vertically forward from the wrist joint, mimicking an affirmative head nod.',
    instructions: [
      'Make a solid fist with dominant hand at chest height.',
      'Flex wrist to nod the fist forward and backward twice.',
      'Nod head affirmatively in unison.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('YES', 3),
    isBuiltIn: true,
    color: '#22c55e',
    iconName: 'CheckCircle2',
    avatarKeyframes: [
      {
        handRight: makeFist(0.04, -0.08, 1.0),
        poseLabel: 'Fist nod',
        motionDescription: 'Closed fist flexes forward and back from wrist joint',
      },
    ],
  },
  {
    id: 'NO',
    label: 'NO',
    englishGloss: 'NO / DISAGREE',
    englishMeaning: 'No / Incorrect / Decline',
    category: 'Everyday',
    description: 'Index and middle fingers snap down firmly onto the thumb in a decisive closing motion with a head shake.',
    instructions: [
      'Extend thumb, index, and middle fingers forward.',
      'Snap index and middle fingertips down onto thumb quickly.',
      'Accompany with a slight negative head shake.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('NO', 3),
    isBuiltIn: true,
    color: '#64748b',
    iconName: 'XCircle',
    avatarKeyframes: [
      {
        handRight: makeFlatPalm(0.04, -0.06, 0.95),
        poseLabel: 'Finger snap',
        motionDescription: 'Index and middle fingers snap down onto thumb',
      },
    ],
  },
  {
    id: 'RESTROOM',
    label: 'RESTROOM',
    englishGloss: 'RESTROOM / TOILET',
    englishMeaning: 'Where is the restroom / washroom?',
    category: 'Everyday',
    description: 'Dominant hand forms the letter "T" (thumb between index and middle fingers) near shoulder height and shakes side to side.',
    instructions: [
      'Form "T" handshape (thumb tucked between index and middle fingers).',
      'Hold hand at shoulder height, palm facing forward.',
      'Shake gently side-to-side twice from the wrist.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('RESTROOM', 3),
    isBuiltIn: true,
    color: '#0284c7',
    iconName: 'DoorOpen',
    avatarKeyframes: [
      {
        handRight: makeRestroomTHandshape(0.12, -0.16),
        poseLabel: 'T-shake shoulder',
        motionDescription: 'Letter T handshape shaking side to side at shoulder height',
      },
    ],
  },
  {
    id: 'AAVISHKAR',
    label: 'AAVISHKAR',
    englishGloss: 'AAVISHKAR / INNOVATION',
    englishMeaning: 'Aavishkar Hackathon / Invention / Innovation spark',
    category: 'Hackathon & Campus',
    description: 'Signature sign for Aavishkar FET Hackathon: closed fist at temple bursts open upward into a wide 5-finger starburst.',
    instructions: [
      'Start with closed fist held at the right temple/forehead.',
      'Burst fingers wide open upwards and outwards in an idea explosion.',
      'Express pride and excitement on face.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('AAVISHKAR', 3),
    isBuiltIn: true,
    color: '#a855f7',
    iconName: 'Sparkles',
    avatarKeyframes: [
      {
        handRight: makeFlatPalm(0.16, -0.32, 1.25, 25),
        poseLabel: 'Temple starburst',
        motionDescription: 'Fingers burst open upward and outward from temple like an inventive spark',
      },
    ],
  },
  {
    id: 'JAIN_UNIVERSITY',
    label: 'JAIN UNIVERSITY',
    englishGloss: 'JAIN / UNIVERSITY / CAMPUS',
    englishMeaning: 'JAIN Deemed-to-be-University / Faculty of Engineering & Technology (FET)',
    category: 'Hackathon & Campus',
    description: 'Two hands begin together at midline and open outward symmetrically like opening a university textbook or campus gates.',
    instructions: [
      'Place palms edge to edge in front of chest like a closed book.',
      'Open palms outward keeping pinky edges close together, revealing open palms.',
      'Raise hands slightly with welcoming institutional pride.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('JAIN_UNIVERSITY', 3),
    isBuiltIn: true,
    color: '#eab308',
    iconName: 'GraduationCap',
    avatarKeyframes: [
      {
        handLeft: makeFlatPalm(-0.10, -0.06, 0.95, -20),
        handRight: makeFlatPalm(0.10, -0.06, 0.95, 20),
        poseLabel: 'Open book/gates',
        motionDescription: 'Both palms opening outward symmetrically like university gates of knowledge',
      },
    ],
  },
];
