import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

let genAI;
let model;

export function initAI() {
  if (!config.geminiApiKey) {
    console.warn('GEMINI_API_KEY missing — AI features disabled');
    return null;
  }

  genAI = new GoogleGenerativeAI(config.geminiApiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('Gemini AI initialized');
  return model;
}

export function getModel() {
  return model;
}

export async function generateReply(prompt) {
  if (!model) return 'AI is not configured. Please set GEMINI_API_KEY.';

  const result = await model.generateContent(prompt);
  const reply = result.response.text();
  return reply;
}
