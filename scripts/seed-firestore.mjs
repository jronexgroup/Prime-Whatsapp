import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require(require('os').homedir() + '/.config/configstore/firebase-tools.json');
const token = config.tokens.access_token;
const projectId = 'cousin-hub';
const jid = '917679811678@s.whatsapp.net';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(jid)}`;

async function fetchWithToken(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function addMessages(messages) {
  const batchSize = 20;
  let added = 0;
  const failed = [];

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const promises = batch.map(async (msg) => {
      const doc = {
        fields: {
          role: { stringValue: msg.role },
          text: { stringValue: truncate(msg.text, 1000) },
          timestamp: { integerValue: msg.timestamp.toString() },
        },
      };
      try {
        await fetchWithToken(
          `${baseUrl}/messages`,
          { method: 'POST', body: JSON.stringify(doc) }
        );
        added++;
      } catch (e) {
        failed.push({ text: msg.text.substring(0, 30), error: e.message });
      }
    });
    await Promise.allSettled(promises);
    console.log(`Progress: ${added}/${messages.length} added` + (failed.length ? `, ${failed.length} failed` : ''));
  }

  if (failed.length) {
    console.log('\nFailed messages:', failed.slice(0, 5));
  }
  return { added, failed: failed.length };
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + '...' : str;
}

// Main
const data = JSON.parse(readFileSync('scripts/sadia_seed.json', 'utf8'));
const messages = data.messages;

console.log(`\nSeeding ${messages.length} messages for Sadia...\n`);
const { added, failed: failedCount } = await addMessages(messages);
console.log(`\nDone! Added ${added} messages, ${failedCount} failed`);
