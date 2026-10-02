import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));

// Persistent custom corpus storage file
const CORPUS_FILE = path.join(__dirname, 'custom-corpus-store.json');
let customSignsCorpus: any[] = [];

try {
  if (fs.existsSync(CORPUS_FILE)) {
    const raw = fs.readFileSync(CORPUS_FILE, 'utf-8');
    customSignsCorpus = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not load existing corpus file:', e);
}

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed initializing GoogleGenAI:', err);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiActive: !!aiClient,
    timestamp: new Date().toISOString(),
  });
});

// Gloss-to-Sentence API (Transforms authentic ISL SOV & WH-End glosses into polite, natural English sentences)
app.post('/api/gloss-to-sentence', async (req, res) => {
  try {
    const { glosses, context } = req.body;
    if (!glosses || !Array.isArray(glosses) || glosses.length === 0) {
      return res.status(400).json({ error: 'Glosses array is required' });
    }

    const glossString = glosses.join(' ');

    // Rule-based fallback dictionary respecting ISL SOV and WH-end structure
    const fallbackSentence = generateRuleBasedEnglish(glosses, context);

    if (!aiClient) {
      return res.json({
        sentence: fallbackSentence,
        source: 'rule-based',
        note: 'Using ISL SOV/WH-End rule-based engine. Add GEMINI_API_KEY in .env for generative nuance.',
      });
    }

    const prompt = `You are an expert Indian Sign Language (ISL) linguist and interpreter for the Aavishkar FET Hackathon Kiosk.
A Deaf participant signed the following sequence of authentic Indian Sign Language (ISL) glosses:
"${glossString}"
Context: ${context || 'Aavishkar FET Hackathon Campus Kiosk'}

IMPORTANT ISL GRAMMAR SPECIFICATION:
- The input glosses follow authentic ISL syntax: Subject-Object-Verb (SOV) order and WH-interrogatives placed at the end (e.g., "RESTROOM WHERE" = "Where is the restroom?", "ME WATER WANT" = "I would like some drinking water, please", "YOU HELP NEED" = "Do you need any assistance?").

Your task:
Translate these authentic ISL glosses into ONE clear, grammatically correct, natural, polite spoken English sentence (standard SVO) for text-to-speech output to a hearing person.
Do NOT output conversational filler, disclaimers, quotation marks, or explanations. Only output the final spoken English sentence.

Examples:
- Input: "RESTROOM WHERE" -> Output: Where is the restroom located?
- Input: "ME WATER WANT" -> Output: Could I please have some drinking water?
- Input: "NAMASTE HELP NEED" -> Output: Namaste, I need some help, please.
- Input: "REGISTRATION DESK WHERE" -> Output: Excuse me, where is the registration desk?
- Input: "ME TEAM AAVISHKAR PROJECT PRESENT" -> Output: We are team Aavishkar and we are here to present our project.
- Input: "DOCTOR NEED URGENT" -> Output: I urgently need a doctor or medical attention.
- Input: "YOU HELP NEED" -> Output: Do you need any help?`;

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

// Speech-to-Sign API (Transforms spoken English into authentic ISL SOV & WH-End glosses)
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
        note: 'Using authentic ISL SOV/WH-End rule mapping engine. Set GEMINI_API_KEY in .env for advanced decomposition.',
      });
    }

    const prompt = `You are a certified Indian Sign Language (ISL) linguist and computational grammar engine for the Aavishkar FET Hackathon Kiosk.
Convert this spoken English sentence into authentic Indian Sign Language (ISL) glosses.

STRICT AUTHENTIC ISL GRAMMAR RULES:
1. SUBJECT-OBJECT-VERB (SOV) ORDER:
   - English SVO ("I want water") MUST become ISL SOV: ["ME", "WATER", "WANT"].
   - "Do you need help?" -> ["YOU", "HELP", "NEED"].
   - "We present project" -> ["WE", "PROJECT", "PRESENT"].
   - "I am looking for doctor" -> ["ME", "DOCTOR", "SEARCH"].

2. INTERROGATIVE / WH-QUESTION TOKENS AT THE ABSOLUTE END:
   - All WH-question tokens (WHERE, WHAT, WHY, HOW, WHEN, WHO) MUST be placed at the VERY END of the gloss array.
   - "Where is the restroom?" -> ["RESTROOM", "WHERE"].
   - "Where can I find drinking water?" -> ["ME", "WATER", "FIND", "WHERE"].
   - "What is your name?" -> ["YOUR", "NAME", "WHAT"].
   - "Where is the registration desk?" -> ["REGISTRATION", "DESK", "WHERE"].
   - "Why are you here?" -> ["YOU", "HERE", "WHY"].

3. ELIMINATE ENGLISH GRAMMATICAL PARTICLES:
   - ELIMINATE ALL auxiliary/copula verbs: "is", "are", "am", "was", "were", "be", "been", "being", "do", "does", "did".
   - ELIMINATE ALL articles: "a", "an", "the".
   - ELIMINATE ALL prepositions and conjunctions: "to", "in", "at", "on", "of", "for", "from", "with", "by", "and", "or", "but".
   - ELIMINATE polite fillers: "please", "kindly" (facial expression conveys politeness in ISL).

4. LEMMATIZE ROOT WORDS ONLY (NO ENGLISH INFLECTIONAL SUFFIXES):
   - Strip all inflectional suffixes like -ing, -ed, -s, -es, -ly, -tion.
   - E.g. "drinking" -> "WATER" or "DRINK", "presenting" -> "PRESENT", "doctors" -> "DOCTOR", "washrooms" -> "RESTROOM".

Spoken sentence: "${speechText}"

Respond with strict JSON ONLY in this format:
{
  "glosses": ["RESTROOM", "WHERE"],
  "expression": "QUESTION",
  "summary": "Restroom location inquiry",
  "keyConcepts": ["restroom", "where"]
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

// Helper rule-based translation heuristics adhering to ISL SOV and WH-end grammar
function generateRuleBasedEnglish(glosses: string[], context?: string): string {
  const g = glosses.map(x => x.toUpperCase().trim());
  const str = g.join(' ');
  const lastGloss = g[g.length - 1];

  // Check if it's an interrogative / WH-question at the end
  if (lastGloss === 'WHERE') {
    if (str.includes('RESTROOM') || str.includes('TOILET') || str.includes('WASHROOM')) {
      return 'Excuse me, where is the restroom located?';
    }
    if (str.includes('WATER')) {
      return 'Could you please tell me where I can find drinking water?';
    }
    if (str.includes('DESK') || str.includes('REGISTRATION')) {
      return 'Where is the registration desk?';
    }
    if (str.includes('DOCTOR') || str.includes('HOSPITAL')) {
      return 'Where can I find a doctor or medical help?';
    }
    const target = g.filter(x => x !== 'WHERE').join(' ');
    return `Where can I find the ${target.toLowerCase()}?`;
  }

  if (lastGloss === 'WHAT') {
    if (str.includes('NAME')) return 'What is your name?';
    return 'What is this?';
  }

  // Greetings and common phrases
  if (str.includes('NAMASTE')) {
    if (str.includes('HELP')) return 'Namaste! Could you please help me?';
    if (str.includes('WELCOME')) return 'Namaste and welcome to the hackathon!';
    return 'Namaste, greetings!';
  }

  if (str.includes('THANK')) return 'Thank you very much!';
  if (str.includes('HELLO')) return 'Hello, nice to meet you!';

  // SOV patterns (Subject - Object - Verb)
  // E.g., "ME WATER WANT" -> "I would like some drinking water, please."
  if (str.includes('WATER') && (str.includes('WANT') || str.includes('NEED') || str.includes('DRINK'))) {
    return 'I would like some drinking water, please.';
  }

  if (str.includes('HELP') && (str.includes('NEED') || str.includes('WANT'))) {
    if (str.startsWith('YOU')) {
      return 'Do you need any help?';
    }
    return 'I need some help or assistance, please.';
  }

  if (str.includes('DOCTOR') || str.includes('HOSPITAL')) {
    if (str.includes('URGENT')) return 'I urgently need a doctor or medical attention.';
    return 'I need to see a doctor, please.';
  }

  if (str.includes('PROJECT') && (str.includes('PRESENT') || str.includes('DEMO'))) {
    return 'We are here to present our project for the hackathon.';
  }

  if (str.includes('AAVISHKAR')) {
    return 'Welcome to the Aavishkar FET Hackathon demo!';
  }

  if (str.includes('JAIN') || str.includes('COLLEGE') || str.includes('CAMPUS')) {
    return 'Welcome to Jain (Deemed-to-be University) Faculty of Engineering.';
  }

  if (str.includes('YES')) return 'Yes, that is correct.';
  if (str.includes('NO')) return 'No, thank you.';

  // General heuristic
  const capitalized = glosses.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `I am signing: "${capitalized}".`;
}

// Deterministic Authentic ISL Grammar Parser
// Applies SOV ordering, WH-end placement, particle elimination, and root word mapping
function generateRuleBasedISL(speech: string) {
  const rawLower = speech.toLowerCase().trim();
  let expression = 'NEUTRAL';

  if (rawLower.includes('?')) expression = 'QUESTION';
  if (rawLower.includes('thank')) expression = 'THANKFUL';
  if (rawLower.includes('welcome') || rawLower.includes('hello') || rawLower.includes('namaste')) expression = 'WELCOMING';
  if (rawLower.includes('urgent') || rawLower.includes('emergency') || rawLower.includes('pain') || rawLower.includes('hurry')) expression = 'URGENT';

  // Step 1: Tokenize & Strip punctuation
  const rawWords = rawLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

  // Step 2: Particles / Auxiliaries / Prepositions / Conjunctions to strictly eliminate
  const stopwords = new Set([
    'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
    'a', 'an', 'the',
    'to', 'in', 'at', 'on', 'of', 'for', 'from', 'with', 'by',
    'and', 'or', 'but', 'so',
    'do', 'does', 'did', 'done',
    'would', 'could', 'should', 'can', 'may', 'might', 'must',
    'please', 'kindly', 'excuse', 'me', 'just', 'there', 'here',
  ]);

  // Step 3: Lemmatize & Map to Dictionary Roots (strip -ing, -ed, -s, -es)
  function toRootGloss(word: string): string | null {
    // Exact mapping overrides
    if (/^i$|^my$|^me$|^myself$/.test(word)) return 'ME';
    if (/^you$|^your$|^yours$/.test(word)) return 'YOU';
    if (/^we$|^our$|^us$/.test(word)) return 'WE';
    if (/^they$|^their$|^them$/.test(word)) return 'THEY';

    if (/^where/.test(word)) return 'WHERE';
    if (/^what/.test(word)) return 'WHAT';
    if (/^why/.test(word)) return 'WHY';
    if (/^how/.test(word)) return 'HOW';
    if (/^when/.test(word)) return 'WHEN';
    if (/^who/.test(word)) return 'WHO';

    if (/^restroom|^washroom|^toilet|^bathroom/.test(word)) return 'RESTROOM';
    if (/^water|^drink/.test(word)) return 'WATER';
    if (/^help|^assist/.test(word)) return 'HELP';
    if (/^need|^require/.test(word)) return 'NEED';
    if (/^want|^wish|^desire/.test(word)) return 'WANT';
    if (/^find|^locate|^search|^look/.test(word)) return 'FIND';
    if (/^present|^show|^display/.test(word)) return 'PRESENT';
    if (/^doctor|^hospital|^physician|^medic/.test(word)) return 'DOCTOR';
    if (/^desk|^counter|^registration/.test(word)) return 'REGISTRATION';
    if (/^namaste/.test(word)) return 'NAMASTE';
    if (/^hello|^hi|^greet/.test(word)) return 'HELLO';
    if (/^welcome/.test(word)) return 'WELCOME';
    if (/^thank/.test(word)) return 'THANK YOU';
    if (/^yes|^yeah|^correct|^agree/.test(word)) return 'YES';
    if (/^no|^not|^never|^deny/.test(word)) return 'NO';
    if (/^jain|^university|^college|^fet/.test(word)) return 'JAIN UNIVERSITY';
    if (/^aavishkar|^hackathon/.test(word)) return 'AAVISHKAR';
    if (/^project|^work|^code/.test(word)) return 'PROJECT';
    if (/^food|^lunch|^eat/.test(word)) return 'FOOD';
    if (/^name/.test(word)) return 'NAME';

    // If it's a stopword, eliminate it
    if (stopwords.has(word)) return null;

    // Stemming heuristic: remove -ing, -ed, -es, -s
    let stemmed = word
      .replace(/ing$/, '')
      .replace(/ed$/, '')
      .replace(/es$/, '')
      .replace(/s$/, '')
      .toUpperCase();

    return stemmed.length > 1 ? stemmed : null;
  }

  // Step 4: Classify tokens into Subject, Object, Verb, and WH-Questions
  const subjects: string[] = [];
  const objects: string[] = [];
  const verbs: string[] = [];
  const whQuestions: string[] = [];

  const subjectSet = new Set(['ME', 'YOU', 'WE', 'THEY']);
  const whSet = new Set(['WHERE', 'WHAT', 'WHY', 'HOW', 'WHEN', 'WHO']);
  const verbSet = new Set(['WANT', 'NEED', 'FIND', 'PRESENT', 'HELP', 'SEARCH', 'GO', 'COME', 'LEARN', 'TEACH', 'EAT']);

  for (const raw of rawWords) {
    const gloss = toRootGloss(raw);
    if (!gloss) continue;

    if (whSet.has(gloss)) {
      if (!whQuestions.includes(gloss)) whQuestions.push(gloss);
    } else if (subjectSet.has(gloss)) {
      if (!subjects.includes(gloss)) subjects.push(gloss);
    } else if (verbSet.has(gloss)) {
      if (!verbs.includes(gloss)) verbs.push(gloss);
    } else {
      if (!objects.includes(gloss)) objects.push(gloss);
    }
  }

  // Step 5: Synthesize strict ISL SOV + WH-End order:
  // Order = [Subject(s)] + [Object(s)] + [Verb(s)] + [WH-Question(s)]
  const orderedGlosses = [...subjects, ...objects, ...verbs, ...whQuestions];

  // Fallback if empty
  const finalGlosses = orderedGlosses.length > 0 ? orderedGlosses : ['HELLO'];

  return {
    glosses: finalGlosses,
    expression,
    summary: speech,
    keyConcepts: finalGlosses.map(g => g.toLowerCase()),
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
