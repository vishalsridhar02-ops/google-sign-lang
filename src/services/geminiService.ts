import { GoogleGenAI } from '@google/genai';

/**
 * Client-Side Safe Translation Engine
 * Works seamlessly in both:
 * 1. Full-stack mode (Express server backend proxying Gemini)
 * 2. Static SPA mode (Netlify / Vercel / GitHub Pages with VITE_GEMINI_API_KEY or offline rule engine)
 * 
 * Never crashes the application on missing keys, network failure, or HTML 404 responses.
 */

let clientGenAI: GoogleGenAI | null = null;
let clientInitChecked = false;

function getClientGenAI(): GoogleGenAI | null {
  if (clientInitChecked) return clientGenAI;
  clientInitChecked = true;

  try {
    const key = (import.meta.env?.VITE_GEMINI_API_KEY as string) || '';
    if (key && typeof key === 'string' && key.trim().length > 0) {
      clientGenAI = new GoogleGenAI({ apiKey: key.trim() });
    }
  } catch (err) {
    console.warn('Client-side Gemini initialization warning (non-fatal):', err);
    clientGenAI = null;
  }

  return clientGenAI;
}

// Deterministic Authentic ISL Grammar Rules (Offline Client-Side Engine)
export function ruleBasedSpeechToISL(speech: string): {
  glosses: string[];
  expression: string;
  summary: string;
} {
  const rawLower = (speech || '').toLowerCase().trim();
  let expression = 'NEUTRAL';

  if (rawLower.includes('?')) expression = 'QUESTION';
  if (rawLower.includes('thank')) expression = 'THANKFUL';
  if (rawLower.includes('welcome') || rawLower.includes('hello') || rawLower.includes('namaste')) expression = 'WELCOMING';
  if (rawLower.includes('urgent') || rawLower.includes('emergency') || rawLower.includes('pain') || rawLower.includes('hurry')) expression = 'URGENT';

  const rawWords = rawLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

  const stopwords = new Set([
    'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
    'a', 'an', 'the',
    'to', 'in', 'at', 'on', 'of', 'for', 'from', 'with', 'by',
    'and', 'or', 'but', 'so',
    'do', 'does', 'did', 'done',
    'would', 'could', 'should', 'can', 'may', 'might', 'must',
    'please', 'kindly', 'excuse', 'me', 'just', 'there', 'here',
  ]);

  function toRootGloss(word: string): string | null {
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

    if (stopwords.has(word)) return null;

    const stemmed = word
      .replace(/ing$/, '')
      .replace(/ed$/, '')
      .replace(/es$/, '')
      .replace(/s$/, '')
      .toUpperCase();

    return stemmed.length > 1 ? stemmed : null;
  }

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

  const orderedGlosses = [...subjects, ...objects, ...verbs, ...whQuestions];
  const finalGlosses = orderedGlosses.length > 0 ? orderedGlosses : ['HELLO'];

  return {
    glosses: finalGlosses,
    expression,
    summary: speech,
  };
}

export function ruleBasedISLToEnglish(glosses: string[], context?: string): string {
  if (!glosses || glosses.length === 0) return 'Hello!';
  const g = glosses.map(x => (x || '').toUpperCase().trim());
  const str = g.join(' ');
  const lastGloss = g[g.length - 1];

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

  if (str.includes('NAMASTE')) {
    if (str.includes('HELP')) return 'Namaste! Could you please help me?';
    if (str.includes('WELCOME')) return 'Namaste and welcome to the hackathon!';
    return 'Namaste, greetings!';
  }

  if (str.includes('THANK')) return 'Thank you very much!';
  if (str.includes('HELLO')) return 'Hello, nice to meet you!';

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

  const capitalized = glosses.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `I am signing: "${capitalized}".`;
}

/**
 * Safely translates glosses to English sentence
 * Tries server endpoint first -> Tries client Gemini -> Falls back to rule engine
 */
export async function translateGlossToSentenceSafe(glosses: string[], context?: string): Promise<string> {
  const fallback = ruleBasedISLToEnglish(glosses, context);

  // 1. Try server backend route
  try {
    const res = await fetch('/api/gloss-to-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glosses, context: context || 'Aavishkar FET Hackathon Kiosk' }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.sentence) return data.sentence;
    }
  } catch (serverErr) {
    // Non-fatal, proceed to client fallback
  }

  // 2. Try direct client Gemini if configured
  const ai = getClientGenAI();
  if (ai) {
    try {
      const prompt = `Convert these authentic ISL glosses into ONE polite spoken English sentence: "${glosses.join(' ')}". Output only the spoken sentence.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      const text = response.text?.trim()?.replace(/^"|"$/g, '');
      if (text) return text;
    } catch (clientGeminiErr) {
      console.warn('Client Gemini call failed, using rule-based grammar engine:', clientGeminiErr);
    }
  }

  // 3. Fallback to ISL SOV/WH-End deterministic engine
  return fallback;
}

/**
 * Safely translates spoken English to ISL gloss sequence
 * Tries server endpoint first -> Tries client Gemini -> Falls back to rule engine
 */
export async function translateSpeechToSignSafe(speechText: string): Promise<{
  glosses: string[];
  expression: string;
  summary: string;
}> {
  const fallback = ruleBasedSpeechToISL(speechText);

  // 1. Try server backend route
  try {
    const res = await fetch('/api/speech-to-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speechText }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.glosses && Array.isArray(data.glosses)) {
        return {
          glosses: data.glosses,
          expression: data.expression || fallback.expression,
          summary: data.summary || speechText,
        };
      }
    }
  } catch (serverErr) {
    // Non-fatal, proceed to client fallback
  }

  // 2. Try direct client Gemini if configured
  const ai = getClientGenAI();
  if (ai) {
    try {
      const prompt = `Convert spoken English "${speechText}" into authentic ISL glosses using SOV order and WH-interrogatives at the end. Output strict JSON with keys "glosses", "expression", "summary".`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      const cleanJson = (response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed?.glosses && Array.isArray(parsed.glosses)) {
        return {
          glosses: parsed.glosses,
          expression: parsed.expression || fallback.expression,
          summary: parsed.summary || speechText,
        };
      }
    } catch (clientGeminiErr) {
      console.warn('Client Gemini call failed, using rule-based grammar engine:', clientGeminiErr);
    }
  }

  // 3. Fallback to ISL SOV/WH-End deterministic engine
  return fallback;
}
