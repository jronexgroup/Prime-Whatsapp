import { getDb, saveMessage, updateMemorySummary, getUserMemory } from '../firebase/index.js';
import { matchCommand } from '../commands/index.js';
import { buildPrompt } from '../memory/index.js';
import { generateReply } from '../ai/index.js';
import { messageQueue } from '../utils/queue.js';
import { config } from '../config/index.js';

const VALID_JID_SUFFIXES = ['@s.whatsapp.net', '@g.us'];
const SKIP_SUFFIXES = ['@broadcast', '@newsletter'];

export function setupHandlers(sock) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      const jid = msg.key?.remoteJid || '?';
      const fromMe = msg.key?.fromMe;
      const hasText = !!(msg.message?.conversation || msg.message?.extendedTextMessage?.text);
      console.log(`[EVENT] upsert type=${type} fromMe=${fromMe} jid=${jid} hasText=${hasText}`);
      await handleMessage(sock, msg);
    }
  });

  sock.ev.on('messages.update', (updates) => {
    for (const u of updates) {
      if (u.key?.remoteJid) {
        console.log(`[EVENT] update ${u.key.remoteJid}`);
      }
    }
  });

  sock.ev.on('presence.update', ({ id, presences }) => {
    if (id?.endsWith('@s.whatsapp.net') || id?.endsWith('@g.us')) {
      const states = Object.entries(presences).map(([jid, p]) => `${jid.split('@')[0]}:${p.lastKnownPresence}`).join(', ');
      console.log(`[EVENT] presence ${id}: ${states}`);
    }
  });
}

async function handleMessage(sock, msg) {
  if (msg.key?.fromMe) return;

  const jid = msg.key.remoteJid;
  if (!jid) return;
  if (SKIP_SUFFIXES.some((s) => jid.endsWith(s))) return;

  const text = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || '';

  if (!text.trim()) return;

  const sender = msg.key.participant || jid;
  const pushName = msg.pushName || 'User';

  console.log(`📩 Message from ${pushName} (${sender}): ${text.substring(0, 60)}`);

  const isGroup = jid.endsWith('@g.us');
  if (isGroup) {
    if (!sock.user) return;
    const isMentioned = text.includes(`@${sock.user.id.split(':')[0]}`);
    if (!isMentioned) return;
  }

  const db = getDb();
  const cleanText = isGroup
    ? text.replace(/@\S+/g, '').trim()
    : text;

  await saveMessage(sender, 'user', cleanText).catch(() => {});

  const cmd = matchCommand(cleanText);
  if (cmd) {
    try {
      const reply = await cmd.handler(sender);
      await sendTypingReply(sock, jid, reply, msg);
      await saveMessage(sender, 'assistant', reply).catch(() => {});
    } catch (err) {
      console.error('[!] Command error:', err?.message || err);
    }
    return;
  }

  await messageQueue.add(async () => {
    try {
      const prompt = await buildPrompt(sender, pushName, cleanText);
      console.log('🤖 Generating AI reply...');
      const reply = await generateReply(prompt);
      console.log(`✅ AI reply: ${reply.substring(0, 60)}`);
      await sendTypingReply(sock, jid, reply, msg);
      await saveMessage(sender, 'assistant', reply).catch(() => {});

      if (db) {
        const memory = await getUserMemory(sender);
        const existingSummary = memory.summary || '';
        if (existingSummary) {
          const newSummary = await generateReply(
            `Summarize this conversation in one short sentence for long-term memory:\nUser: ${cleanText}\nAssistant: ${reply}\n\nKeep it under 20 words.`
          );
          const merged = existingSummary + ' | ' + newSummary;
          const finalSummary = merged.length > 500
            ? merged.slice(-500)
            : merged;
          await updateMemorySummary(sender, finalSummary).catch(() => {});
        } else {
          const newSummary = await generateReply(
            `Create a short memory summary about this user in under 15 words:\nUser said: ${cleanText}`
          );
          await updateMemorySummary(sender, newSummary).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Handler error:', err?.message || err);
    }
  });
}

async function sendTypingReply(sock, jid, text, quotedKey) {
  try {
    await sock.sendPresenceUpdate('composing', jid);
    await sleep(getTypingDelay(text));
    await sock.sendMessage(jid, { text }, { quoted: quotedKey });
    await sock.sendPresenceUpdate('paused', jid);
  } catch (err) {
    console.error('[!] Send error:', err?.message || err);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getTypingDelay(text) {
  if (!text) return 500;
  const base = text.length * 30;
  return Math.min(Math.max(base, 500), 3000);
}
