#THIS IS NOT AN OFICAL WEBSITE MADE MY ME THIS A DEMO OR PRACTICE MADE FOR ME
# Aavishkar ISL Two-Way Kiosk & Low-Resource Corpus Builder

**Aavishkar FET Hackathon (Faculty of Engineering & Technology, JAIN Deemed-to-be University)**

An AI-powered two-way communication kiosk that bridges the gap between Indian Sign Language (ISL) users and hearing individuals in real time. It features a novel **low-resource corpus builder** capable of learning new signs from as few as **3 examples**.

---

## 🌟 Key Features

1. **Two-Way Real-Time Communication Kiosk**:
   - **"Hold to Sign" (Deaf Participant)**:
     - Real-time webcam tracking using **MediaPipe Hand Landmarker** (21 3D hand joints).
     - Spatial-temporal feature extraction (wrist-relative translation, palm scaling, finger curl).
     - Fast **Dynamic Time Warping (DTW)** sequence classifier.
     - **Google Gemini 3.8 Flash** converts detected ISL glosses into polite, natural spoken English.
     - Automatic voice output via browser **Web Speech Text-to-Speech (TTS)**.
   - **"Hold to Speak" (Hearing Participant)**:
     - Real-time **Speech-to-Text (STT)** with microphone visualizer.
     - Gemini decomposes speech into ISL glosses and emotional tone (`QUESTION`, `WELCOMING`, `URGENT`, `THANKFUL`).
     - **Animated ISL Sign Avatar**: Renders 3D procedural hand and facial skeletal animations corresponding to the decoded signs.

2. **Low-Resource Corpus Studio (3-Shot Learning)**:
   - Learn new vocabulary with only **3 to 20 recorded samples** per sign.
   - Interactive recording studio with countdown, real-time landmark feature extraction, and confetti celebration.
   - Pre-seeded with authentic ISL vocabulary (*Namaste, Hello, Thank You, Help, Water, Doctor, Restroom, Where, Yes, No, Aavishkar, Jain University*).
   - Export and import corpus datasets in JSON format.

3. **Multiple Kiosk Layouts**:
   - **Split-Screen View**: Dual side-by-side interface for Deaf and Hearing participants.
   - **Overlay HUD View**: High-contrast full-screen camera canvas with floating HUD and giant touch buttons.

4. **Interactive Poster Architecture & Guide**:
   - Interactive replica of the **Tech Stack, Workflow, and Techflow** poster diagram.
   - Searchable ISL vocabulary catalog with execution tips.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Canvas Confetti
- **Computer Vision**: MediaPipe Tasks Vision (Hand Landmarker), HTML5 Canvas 2D/3D
- **AI & Reasoning**: Google Gemini API (`gemini-3.8-flash`) via `@google/genai`
- **Speech**: Web Speech API (STT & TTS) + Web Audio API synth
- **Backend**: Node.js & Express / TSX with Vite middleware integration
- **Sequence Matching**: Dynamic Time Warping (DTW) with translation & scale invariance

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Chrome or modern Chromium browser (recommended for Web Speech API and MediaPipe GPU delegate)

### Installation
```bash
# Clone the repository
git clone https://github.com/vishalsridhar02-ops/google-ai-studio.git
cd google-ai-studio

# Install dependencies
npm install

# Configure environment variables (optional: add your Gemini API key)
cp .env.example .env

# Start development server
npm run dev
```

Visit `http://localhost:3000` in Google Chrome.

---

## 🏛️ Acknowledgements
- **JAIN (Deemed-to-be University)** — Faculty of Engineering and Technology (FET)
- **Aavishkar FET Hackathon** & FET Alumni and Outreach
