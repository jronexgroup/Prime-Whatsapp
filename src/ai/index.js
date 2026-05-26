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
            { role: 'system', content: 'You are Prime, a friendly WhatsApp assistant. Reply concisely and naturally in the same language as the user.' },
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

    return data.result.response;
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
