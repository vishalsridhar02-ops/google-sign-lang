import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '15mb' }));

// In-memory / persisted corpus backup store
const CORPUS_FILE = path.join(__dirname, 'custom-corpus-store.json');
let customSignsCorpus: any[] = [];

try {
  if (fs.existsSync(CORPUS_FILE)) {
    const raw = fs.readFileSync(CORPUS_FILE, 'utf-8');
    customSignsCorpus = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not load custom corpus store:', e);
}

// Initialize Gemini SDK if API key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Gemini API Client initialized with model gemini-3.8-flash.');
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiActive: !!aiClient,
    model: 'gemini-3.8-flash',
    uptime: process.uptime(),
    customSignsCount: customSignsCorpus.length,
    timestamp: new Date().toISOString(),
  });
});

// Gloss-to-Sentence API (Transforms ISL glosses into polite, natural English sentences)
app.post('/api/gloss-to-sentence', async (req, res) => {
  try {
    const { glosses, context } = req.body;
    if (!glosses || !Array.isArray(glosses) || glosses.length === 0) {
      return res.status(400).json({ error: 'Glosses array is required' });
    }

    const glossString = glosses.join(' ');

    // Rule-based fallback dictionary
    const fallbackSentence = generateRuleBasedEnglish(glosses, context);

    if (!aiClient) {
      return res.json({
        sentence: fallbackSentence,
        source: 'rule-based',
        note: 'Using intelligent rule-based engine. Add GEMINI_API_KEY in .env for generative nuance.',
      });
    }

    const prompt = `You are the AI brain of the "Aavishkar FET Hackathon" Two-Way Indian Sign Language (ISL) Kiosk.
A Deaf user signed the following sequence of ISL glosses:
"${glossString}"
Context / Situation: ${context || 'Public Kiosk / University Hackathon Booth'}

Your task:
Convert these ISL glosses into ONE clear, grammatically correct, natural, polite spoken English sentence that can be spoken out loud via text-to-speech to a hearing person at the booth.
Do NOT output conversational filler, disclaimers, quotation marks, or explanations. Only output the final spoken sentence.

Example 1:
Glosses: "NAMASTE HELP NEED"
Output: Hello, I need some help, please.

Example 2:
Glosses: "WHERE REGISTRATION DESK"
Output: Excuse me, where is the registration desk located?

Example 3:
Glosses: "WATER BOTTLE WHERE CAN FIND"
Output: Could you please tell me where I can find drinking water?

Example 4:
Glosses: "ME TEAM AAVISHKAR PRESENT PROJECT"
Output: We are team Aavishkar and we are here to present our project.`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const sentence = response.text ? response.text.trim().replace(/^"|"$/g, '') : fallbackSentence;
      return res.json({
        sentence: sentence || fallbackSentence,
        source: 'gemini-3.8-flash',
      });
    } catch (apiErr: any) {
      console.warn('Gemini API call failed, falling back to rule-based parser:', apiErr?.message);
      return res.json({
        sentence: fallbackSentence,
        source: 'fallback-rules',
        error: apiErr?.message,
      });
    }
  } catch (err: any) {
    console.error('Error in /api/gloss-to-sentence:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Speech-to-Sign API (Transforms spoken English into structured ISL glosses and visual visualizer instructions)
app.post('/api/speech-to-sign', async (req, res) => {
  try {
    const { speechText } = req.body;
    if (!speechText || typeof speechText !== 'string') {
      return res.status(400).json({ error: 'speechText string is required' });
    }

    const fallbackResult = generateRuleBasedISL(speechText);

    if (!aiClient) {
      return res.json({
        ...fallbackResult,
        source: 'rule-based',
        note: 'Using intelligent sign mapping engine. Set GEMINI_API_KEY in .env for advanced decomposition.',
      });
    }

    const prompt = `You are the AI brain of the Aavishkar FET Hackathon Two-Way Indian Sign Language (ISL) Kiosk.
A hearing person spoke this sentence into the kiosk microphone:
"${speechText}"

Convert this spoken English into:
1. An array of simplified Indian Sign Language (ISL) gloss tokens in chronological signing grammar (ISL uses Topic-Comment / Subject-Object-Verb order).
2. The primary emotion or facial expression to convey (e.g., "NEUTRAL", "QUESTION", "WELCOMING", "URGENT", "THANKFUL").
3. A simplified visual summary sentence for the sign display.

Respond with strict JSON ONLY in this format:
{
  "glosses": ["HELLO", "WELCOME", "CAMPUS"],
  "expression": "WELCOMING",
  "summary": "Welcome to our campus!",
  "keyConcepts": ["welcome", "campus"]
}`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let parsed;
      const text = response.text || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        parsed = JSON.parse(cleanJson);
      } catch (jsonErr) {
        parsed = fallbackResult;
      }

      return res.json({
        glosses: parsed.glosses || fallbackResult.glosses,
        expression: parsed.expression || fallbackResult.expression,
        summary: parsed.summary || speechText,
        keyConcepts: parsed.keyConcepts || fallbackResult.keyConcepts,
        source: 'gemini-3.8-flash',
      });
    } catch (apiErr: any) {
      console.warn('Gemini speech-to-sign failed, falling back:', apiErr?.message);
      return res.json({
        ...fallbackResult,
        source: 'fallback-rules',
        error: apiErr?.message,
      });
    }
  } catch (err: any) {
    console.error('Error in /api/speech-to-sign:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Corpus sync endpoints for low-resource corpus builder
app.get('/api/corpus', (req, res) => {
  res.json({
    signs: customSignsCorpus,
    count: customSignsCorpus.length,
  });
});

app.post('/api/corpus', (req, res) => {
  try {
    const { signs } = req.body;
    if (Array.isArray(signs)) {
      customSignsCorpus = signs;
      try {
        fs.writeFileSync(CORPUS_FILE, JSON.stringify(customSignsCorpus, null, 2), 'utf-8');
      } catch (fsErr) {
        console.warn('Failed saving corpus to disk:', fsErr);
      }
      return res.json({ success: true, count: customSignsCorpus.length });
    }
    res.status(400).json({ error: 'signs array required' });
  } catch (err) {
    res.status(500).json({ error: 'Could not save corpus' });
  }
});

// Helper rule-based translation heuristics
function generateRuleBasedEnglish(glosses: string[], context?: string): string {
  const g = glosses.map(x => x.toUpperCase().trim());
  const str = g.join(' ');

  if (str.includes('NAMASTE') && str.includes('HELP')) return 'Namaste! Could you please help me?';
  if (str.includes('NAMASTE') || str.includes('HELLO')) {
    if (str.includes('WELCOME')) return 'Hello and welcome!';
    return 'Hello, greetings!';
  }
  if (str.includes('THANK')) return 'Thank you very much!';
  if (str.includes('WATER')) return 'Could you please give me some drinking water?';
  if (str.includes('DOCTOR') || str.includes('HOSPITAL') || str.includes('MEDICINE')) return 'I need medical assistance or a doctor, please.';
  if (str.includes('RESTROOM') || str.includes('TOILET') || str.includes('WASHROOM')) return 'Could you show me where the restroom is?';
  if (str.includes('WHERE') && str.includes('ROOM')) return 'Excuse me, where is this room located?';
  if (str.includes('WHERE') && str.includes('DESK')) return 'Where can I find the registration desk?';
  if (str.includes('YES')) return 'Yes, that is correct.';
  if (str.includes('NO')) return 'No, thank you.';
  if (str.includes('STOP')) return 'Please stop for a moment.';
  if (str.includes('AAVISHKAR')) return 'Welcome to the Aavishkar FET Hackathon demo!';
  if (str.includes('COLLEGE') || str.includes('JAIN')) return 'Welcome to Jain Deemed-to-be University.';

  // General heuristic
  const capitalized = glosses.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `I am signing: "${capitalized}".`;
}

function generateRuleBasedISL(speech: string) {
  const s = speech.toLowerCase();
  const glosses: string[] = [];
  let expression = 'NEUTRAL';

  if (s.includes('?')) expression = 'QUESTION';
  if (s.includes('thank')) expression = 'THANKFUL';
  if (s.includes('welcome') || s.includes('hello') || s.includes('hi')) expression = 'WELCOMING';
  if (s.includes('urgent') || s.includes('emergency') || s.includes('pain')) expression = 'URGENT';

  const vocabMap: [RegExp, string][] = [
    [/hello|hi|greetings/i, 'HELLO'],
    [/namaste/i, 'NAMASTE'],
    [/welcome/i, 'WELCOME'],
    [/thank/i, 'THANK YOU'],
    [/help|assist/i, 'HELP'],
    [/water|drink/i, 'WATER'],
    [/doctor|medical|hospital/i, 'DOCTOR'],
    [/restroom|washroom|toilet|bathroom/i, 'RESTROOM'],
    [/where|location/i, 'WHERE'],
    [/yes|ok|okay|sure/i, 'YES'],
    [/no|nope|not/i, 'NO'],
    [/stop|wait/i, 'STOP'],
    [/jain|university|college/i, 'JAIN UNIVERSITY'],
    [/aavishkar|hackathon/i, 'AAVISHKAR'],
    [/desk|counter|registration/i, 'REGISTRATION'],
    [/food|lunch|eat/i, 'FOOD'],
    [/name/i, 'NAME'],
    [/good/i, 'GOOD'],
  ];

  vocabMap.forEach(([regex, gloss]) => {
    if (regex.test(s) && !glosses.includes(gloss)) {
      glosses.push(gloss);
    }
  });

  if (glosses.length === 0) {
    const words = speech.split(/\s+/).slice(0, 4);
    words.forEach(w => {
      const clean = w.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (clean.length > 2) glosses.push(clean);
    });
  }

  return {
    glosses: glosses.length ? glosses : ['HELLO'],
    expression,
    summary: speech,
    keyConcepts: glosses.map(g => g.toLowerCase()),
  };
}

// Git bundle and archive download endpoints
app.get('/api/download-bundle', (req, res) => {
  const bundlePath = path.join(__dirname, 'isl-kiosk.bundle');
  if (fs.existsSync(bundlePath)) {
    res.download(bundlePath, 'isl-kiosk.bundle');
  } else {
    res.status(404).send('Bundle not found');
  }
});

app.get('/api/download-archive', (req, res) => {
  const archivePath = path.join(__dirname, 'aavishkar-isl-kiosk.tar.gz');
  if (fs.existsSync(archivePath)) {
    res.download(archivePath, 'aavishkar-isl-kiosk.tar.gz');
  } else {
    res.status(404).send('Archive not found');
  }
});

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
