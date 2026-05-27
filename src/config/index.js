import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadFirebaseKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n');
}

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  cf: {
    accountId: process.env.CF_ACCOUNT_ID,
    apiToken: process.env.CF_API_TOKEN,
    model: process.env.CF_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: loadFirebaseKey(),
  },
  bot: {
    name: process.env.BOT_NAME || 'Prime',
    prefix: process.env.BOT_PREFIX || '.',
    ownerNumber: process.env.OWNER_NUMBER || '',
  },
  session: {
    dir: resolve('sessions'),
  },
  memory: {
    maxMessages: 20,
  },
};
