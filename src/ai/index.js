import { config } from '../config/index.js';

const CF_API = 'https://api.cloudflare.com/client/v4/accounts';

let modelName;
let ready = false;

export function initAI() {
  if (!config.cf.accountId || !config.cf.apiToken) {
    console.warn('CF_ACCOUNT_ID or CF_API_TOKEN missing — AI features disabled');
    return null;
  }
  modelName = config.cf.model;
  ready = true;
  console.log(`Cloudflare AI initialized (model: ${modelName})`);
  return true;
}

export function getModel() {
  return ready ? modelName : null;
}

export async function generateReply(prompt) {
  if (!ready) return '⚙️ AI is not configured.';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      `${CF_API}/${config.cf.accountId}/ai/run/${modelName}`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.cf.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are ${config.bot.name} talking to a friend. Reply in the EXACT same language as the friend.

Friend writes Banglish (Bengali in roman letters):
  "kemon acho?"  ->  "bhalo achi, tumi kemon?"
  "ki korcho?"   ->  "kisu na, just chill korchi"
  "kalke ghurte jabi?"  ->  "haan jabo, kothay jabo?"
  "ei sob ki bolchis?"  ->  "ar kichu na, just fun korchi"

Friend writes English -> reply English. Friend writes Hinglish -> reply Hinglish.

NEVER use Bengali/Hindi Unicode (ো, ই, आ, इ). Only a-z roman letters.
Be natural, 1-3 sentences, never repeat their question, no honorifics like didi/bhai/sir.` },
            { role: 'user', content: prompt },
          ],
        }),
      }
    );

    clearTimeout(timeout);
    const data = await res.json();
    if (!data.success) {
      const err = data.errors?.[0]?.message || 'Unknown error';
      throw new Error(err);
    }

    const text = data.result?.choices?.[0]?.message?.content
      || data.result?.response
      || '';
    return text.trim();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('Cloudflare AI timeout (30s)');
    } else {
      console.error('Cloudflare AI error:', err?.message || err);
    }
    return '⚠️ AI temporarily unavailable. Try again later.';
  }
}
