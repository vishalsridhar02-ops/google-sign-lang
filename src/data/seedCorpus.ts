import { SignDefinition, Landmark3D, HandFrame, SignSample } from '../types/isl';

// Generate typical landmark positions for basic handshapes
function makeFlatPalm(offsetX = 0, offsetY = 0, scale = 1): Landmark3D[] {
  // 21 landmarks: 0: wrist, 1-4: thumb, 5-8: index, 9-12: middle, 13-16: ring, 17-20: pinky
  const pts: Landmark3D[] = [
    { x: 0.5 + offsetX, y: 0.7 + offsetY, z: 0 }, // 0: wrist
    // Thumb
    { x: 0.44 + offsetX, y: 0.65 + offsetY, z: -0.02 },
    { x: 0.41 + offsetX, y: 0.58 + offsetY, z: -0.04 },
    { x: 0.38 + offsetX, y: 0.52 + offsetY, z: -0.05 },
    { x: 0.35 + offsetX, y: 0.47 + offsetY, z: -0.06 },
    // Index
    { x: 0.46 + offsetX, y: 0.52 + offsetY, z: -0.02 },
    { x: 0.45 + offsetX, y: 0.44 + offsetY, z: -0.03 },
    { x: 0.45 + offsetX, y: 0.37 + offsetY, z: -0.03 },
    { x: 0.45 + offsetX, y: 0.30 + offsetY, z: -0.03 },
    // Middle
    { x: 0.50 + offsetX, y: 0.51 + offsetY, z: -0.01 },
    { x: 0.50 + offsetX, y: 0.42 + offsetY, z: -0.02 },
    { x: 0.50 + offsetX, y: 0.34 + offsetY, z: -0.02 },
    { x: 0.50 + offsetX, y: 0.27 + offsetY, z: -0.02 },
    // Ring
    { x: 0.54 + offsetX, y: 0.53 + offsetY, z: 0 },
    { x: 0.55 + offsetX, y: 0.45 + offsetY, z: 0 },
    { x: 0.55 + offsetX, y: 0.38 + offsetY, z: 0 },
    { x: 0.55 + offsetX, y: 0.32 + offsetY, z: 0 },
    // Pinky
    { x: 0.58 + offsetX, y: 0.56 + offsetY, z: 0.01 },
    { x: 0.60 + offsetX, y: 0.50 + offsetY, z: 0.01 },
    { x: 0.61 + offsetX, y: 0.45 + offsetY, z: 0.01 },
    { x: 0.62 + offsetX, y: 0.40 + offsetY, z: 0.01 },
  ];

  return pts.map(p => ({
    x: 0.5 + (p.x - 0.5) * scale,
    y: 0.5 + (p.y - 0.5) * scale,
    z: p.z * scale,
  }));
}

function makeFist(offsetX = 0, offsetY = 0, scale = 1): Landmark3D[] {
  const pts: Landmark3D[] = [
    { x: 0.5 + offsetX, y: 0.7 + offsetY, z: 0 }, // 0: wrist
    // Thumb curled over fingers
    { x: 0.45 + offsetX, y: 0.65 + offsetY, z: -0.02 },
    { x: 0.43 + offsetX, y: 0.60 + offsetY, z: -0.04 },
    { x: 0.45 + offsetX, y: 0.56 + offsetY, z: -0.05 },
    { x: 0.48 + offsetX, y: 0.55 + offsetY, z: -0.06 },
    // Index curled
    { x: 0.47 + offsetX, y: 0.56 + offsetY, z: -0.02 },
    { x: 0.46 + offsetX, y: 0.50 + offsetY, z: -0.03 },
    { x: 0.48 + offsetX, y: 0.54 + offsetY, z: -0.01 },
    { x: 0.48 + offsetX, y: 0.59 + offsetY, z: 0.01 },
    // Middle curled
    { x: 0.50 + offsetX, y: 0.55 + offsetY, z: -0.01 },
    { x: 0.50 + offsetX, y: 0.49 + offsetY, z: -0.02 },
    { x: 0.51 + offsetX, y: 0.53 + offsetY, z: 0 },
    { x: 0.51 + offsetX, y: 0.58 + offsetY, z: 0.02 },
    // Ring curled
    { x: 0.53 + offsetX, y: 0.56 + offsetY, z: 0 },
    { x: 0.53 + offsetX, y: 0.51 + offsetY, z: 0 },
    { x: 0.53 + offsetX, y: 0.55 + offsetY, z: 0.01 },
    { x: 0.53 + offsetX, y: 0.59 + offsetY, z: 0.02 },
    // Pinky curled
    { x: 0.56 + offsetX, y: 0.58 + offsetY, z: 0.01 },
    { x: 0.56 + offsetX, y: 0.54 + offsetY, z: 0.01 },
    { x: 0.56 + offsetX, y: 0.57 + offsetY, z: 0.02 },
    { x: 0.55 + offsetX, y: 0.60 + offsetY, z: 0.03 },
  ];

  return pts.map(p => ({
    x: 0.5 + (p.x - 0.5) * scale,
    y: 0.5 + (p.y - 0.5) * scale,
    z: p.z * scale,
  }));
}

function makePointingIndex(offsetX = 0, offsetY = 0): Landmark3D[] {
  const fist = makeFist(offsetX, offsetY);
  // Extend index finger straight up
  fist[5] = { x: 0.48 + offsetX, y: 0.52 + offsetY, z: -0.02 };
  fist[6] = { x: 0.48 + offsetX, y: 0.42 + offsetY, z: -0.03 };
  fist[7] = { x: 0.48 + offsetX, y: 0.34 + offsetY, z: -0.03 };
  fist[8] = { x: 0.48 + offsetX, y: 0.26 + offsetY, z: -0.03 };
  return fist;
}

function makeNamasteHand(isLeft = false): Landmark3D[] {
  const palm = makeFlatPalm(isLeft ? -0.08 : 0.08, 0, 0.95);
  // Tilt hand vertically inward
  return palm.map(pt => ({
    x: pt.x + (isLeft ? 0.04 : -0.04),
    y: pt.y - 0.08,
    z: pt.z,
  }));
}

function makeOpenWave(offsetY = 0): Landmark3D[] {
  const palm = makeFlatPalm(0.12, -0.15 + offsetY, 1.05);
  return palm;
}

function makeWaterCup(): Landmark3D[] {
  const palm = makeFist(0.04, -0.08, 1.0);
  // Thumb extended slightly towards mouth
  palm[4] = { x: 0.44, y: 0.46, z: -0.08 };
  return palm;
}

// Generate synthesized sample trajectory (15 frames) for a sign
function generateSyntheticSamples(signId: string, count: number = 3): SignSample[] {
  const samples: SignSample[] = [];

  for (let i = 0; i < count; i++) {
    const frames: HandFrame[] = [];
    const jitter = (Math.random() - 0.5) * 0.02;

    for (let f = 0; f < 15; f++) {
      const t = f / 14;
      let landmarks: Landmark3D[];

      if (signId === 'NAMASTE') {
        const yMove = Math.sin(t * Math.PI) * -0.03;
        landmarks = makeNamasteHand(false).map(p => ({
          x: p.x + jitter,
          y: p.y + yMove,
          z: p.z,
        }));
      } else if (signId === 'HELLO') {
        // Wave back and forth
        const xMove = Math.sin(t * Math.PI * 2) * 0.05;
        landmarks = makeOpenWave(jitter).map(p => ({
          x: p.x + xMove,
          y: p.y,
          z: p.z,
        }));
      } else if (signId === 'THANK_YOU') {
        // Hand moves forward from chin
        const yDown = t * 0.08;
        const zForward = t * -0.06;
        landmarks = makeFlatPalm(0, -0.15 + yDown + jitter).map(p => ({
          x: p.x,
          y: p.y,
          z: p.z + zForward,
        }));
      } else if (signId === 'HELP') {
        // Upward lifting motion
        const yUp = -t * 0.08;
        landmarks = makeFist(0, jitter + yUp).map(p => ({
          x: p.x,
          y: p.y,
          z: p.z,
        }));
      } else if (signId === 'WATER') {
        // Tipping to mouth
        const tilt = Math.sin(t * Math.PI) * -0.06;
        landmarks = makeWaterCup().map(p => ({
          x: p.x,
          y: p.y + tilt + jitter,
          z: p.z,
        }));
      } else if (signId === 'YES') {
        // Nodding fist
        const yNod = Math.sin(t * Math.PI * 2) * 0.04;
        landmarks = makeFist(0, jitter + yNod);
      } else if (signId === 'NO') {
        // Index & middle snap
        const point = makePointingIndex(0, jitter);
        landmarks = point;
      } else if (signId === 'WHERE') {
        // Open hands oscillating
        const xOsc = Math.sin(t * Math.PI * 2) * 0.04;
        landmarks = makeFlatPalm(xOsc + jitter, 0.05);
      } else if (signId === 'AAVISHKAR') {
        // Victory gesture moving upward
        const v = makePointingIndex(0, -t * 0.06 + jitter);
        // Extend middle finger too
        v[12] = { x: 0.52, y: 0.28, z: -0.03 };
        landmarks = v;
      } else {
        landmarks = makeFlatPalm(jitter, jitter);
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

export const SEED_ISL_SIGNS: SignDefinition[] = [
  {
    id: 'NAMASTE',
    label: 'NAMASTE',
    englishGloss: 'NAMASTE / GREETINGS',
    englishMeaning: 'Hello / Greetings / Welcome (Traditional Indian greeting)',
    category: 'Greetings',
    description: 'Bring both hands flat together in front of the chest with fingers pointing upwards and slight head bow.',
    instructions: [
      'Bring palms flat together at chest level.',
      'Fingers aligned vertically pointing towards chin.',
      'Hold steadily or bow gently for 1-2 seconds.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('NAMASTE', 3),
    isBuiltIn: true,
    color: '#8b5cf6', // purple
    iconName: 'HeartHandshake',
    avatarKeyframes: [
      {
        handLeft: makeNamasteHand(true),
        handRight: makeNamasteHand(false),
        poseLabel: 'Chest center',
        motionDescription: 'Two palms meeting in prayer position with respectful nod',
      },
    ],
  },
  {
    id: 'HELLO',
    label: 'HELLO',
    englishGloss: 'HELLO / HI',
    englishMeaning: 'Hello / Hi / Hey',
    category: 'Greetings',
    description: 'Open hand near forehead or temple waving gently outward towards the listener.',
    instructions: [
      'Raise dominant hand to forehead or temple height.',
      'Open flat palm facing outward.',
      'Wave hand gently from side to side or outward salute.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('HELLO', 3),
    isBuiltIn: true,
    color: '#06b6d4', // cyan
    iconName: 'Hand',
    avatarKeyframes: [
      {
        handRight: makeOpenWave(0),
        poseLabel: 'Temple height',
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
    description: 'Fingertips of flat hand touch chin/lips, then move smoothly forward and slightly downward toward the listener.',
    instructions: [
      'Touch fingertips of dominant flat hand to chin.',
      'Move hand outward and forward in a respectful arc toward the person.',
      'Maintain friendly facial expression.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('THANK_YOU', 3),
    isBuiltIn: true,
    color: '#10b981', // emerald
    iconName: 'Smile',
    avatarKeyframes: [
      {
        handRight: makeFlatPalm(0, -0.15),
        poseLabel: 'Chin level',
        motionDescription: 'Fingers touch chin, then arc outward toward listener',
      },
    ],
  },
  {
    id: 'HELP',
    label: 'HELP',
    englishGloss: 'HELP / ASSIST',
    englishMeaning: 'Please help me / I need assistance',
    category: 'Emergency & Help',
    description: 'Closed fist with thumb extended resting on an open flat palm, moving upward together.',
    instructions: [
      'Place non-dominant hand flat horizontally as a base platform.',
      'Place dominant fist with thumbs up on top of the base palm.',
      'Lift both hands upward together twice.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('HELP', 3),
    isBuiltIn: true,
    color: '#ef4444', // red
    iconName: 'AlertCircle',
    avatarKeyframes: [
      {
        handLeft: makeFlatPalm(-0.06, 0.08),
        handRight: makeFist(0.06, 0.02),
        poseLabel: 'Upward lift',
        motionDescription: 'Fist resting on flat palm raised upward together',
      },
    ],
  },
  {
    id: 'WATER',
    label: 'WATER',
    englishGloss: 'WATER / DRINK',
    englishMeaning: 'I need water / Drinking water',
    category: 'Everyday',
    description: 'Hand forms a cup or "W" shape near mouth and tilts gently mimicking drinking.',
    instructions: [
      'Form loose fist or W-handshape near mouth.',
      'Tilt thumb toward mouth as if sipping water.',
      'Repeat small tilting motion twice.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('WATER', 3),
    isBuiltIn: true,
    color: '#3b82f6', // blue
    iconName: 'Droplets',
    avatarKeyframes: [
      {
        handRight: makeWaterCup(),
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
    description: 'Tap fingertips of dominant hand on the inner wrist of the non-dominant hand as if checking pulse.',
    instructions: [
      'Extend non-dominant arm forward, palm facing up.',
      'Tap index and middle fingertips of dominant hand onto inner wrist pulse point.',
      'Tap twice with urgent or serious facial expression.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('DOCTOR', 3),
    isBuiltIn: true,
    color: '#f43f5e', // rose
    iconName: 'Stethoscope',
  },
  {
    id: 'WHERE',
    label: 'WHERE',
    englishGloss: 'WHERE / LOCATION',
    englishMeaning: 'Where is it? / Which direction?',
    category: 'Questions',
    description: 'Both hands held forward with open palms facing upward, oscillating gently side to side with furrowed brow.',
    instructions: [
      'Hold both hands in front at waist-chest level, palms facing up.',
      'Move hands side to side with questioning facial expression.',
      'Furrow brows slightly to indicate question grammar in ISL.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('WHERE', 3),
    isBuiltIn: true,
    color: '#f59e0b', // amber
    iconName: 'HelpCircle',
  },
  {
    id: 'YES',
    label: 'YES',
    englishGloss: 'YES / AGREE',
    englishMeaning: 'Yes / Correct / I agree',
    category: 'Everyday',
    description: 'Fist nodding forward from wrist joint like a head nodding yes.',
    instructions: [
      'Make a fist with dominant hand at chest height.',
      'Flex wrist to tilt fist forward and back twice.',
      'Nod head affirmatively in sync.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('YES', 3),
    isBuiltIn: true,
    color: '#22c55e', // green
    iconName: 'CheckCircle2',
  },
  {
    id: 'NO',
    label: 'NO',
    englishGloss: 'NO / DISAGREE',
    englishMeaning: 'No / Incorrect / Decline',
    category: 'Everyday',
    description: 'Index and middle fingers snap down onto thumb quickly, accompanied by slight head shake.',
    instructions: [
      'Extend thumb, index, and middle fingers.',
      'Snap index and middle fingers down to touch thumb firmly.',
      'Shake head slightly.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('NO', 3),
    isBuiltIn: true,
    color: '#64748b', // slate
    iconName: 'XCircle',
  },
  {
    id: 'RESTROOM',
    label: 'RESTROOM',
    englishGloss: 'RESTROOM / TOILET',
    englishMeaning: 'Where is the restroom / washroom?',
    category: 'Everyday',
    description: 'Hand forms letter "T" (thumb between index and middle fingers) and shakes side to side.',
    instructions: [
      'Form "T" handshape or open palm near shoulder.',
      'Shake gently side-to-side twice.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('RESTROOM', 3),
    isBuiltIn: true,
    color: '#0284c7', // light blue
    iconName: 'DoorOpen',
  },
  {
    id: 'AAVISHKAR',
    label: 'AAVISHKAR',
    englishGloss: 'AAVISHKAR / INNOVATION',
    englishMeaning: 'Aavishkar Hackathon / Invention / Innovation',
    category: 'Hackathon & Campus',
    description: 'Custom sign for Aavishkar FET Hackathon: fingers spread from temple upward like a burst of innovation/ideas.',
    instructions: [
      'Start with closed fist near forehead.',
      'Burst fingers wide open upwards and outward (innovation spark).',
      'Proud and energetic expression.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('AAVISHKAR', 3),
    isBuiltIn: true,
    color: '#a855f7', // purple
    iconName: 'Sparkles',
  },
  {
    id: 'JAIN_UNIVERSITY',
    label: 'JAIN UNIVERSITY',
    englishGloss: 'JAIN / UNIVERSITY / CAMPUS',
    englishMeaning: 'JAIN Deemed-to-be-University / Faculty of Engineering & Technology',
    category: 'Hackathon & Campus',
    description: 'Two hands opening outward from center like opening a knowledge book or university gates.',
    instructions: [
      'Place palms edge to edge like a closed book.',
      'Open palms outward keeping pinky edges touching.',
      'Raise slightly with pride.',
    ],
    minExamplesRequired: 3,
    samples: generateSyntheticSamples('JAIN_UNIVERSITY', 3),
    isBuiltIn: true,
    color: '#eab308', // gold/yellow
    iconName: 'GraduationCap',
  },
];
