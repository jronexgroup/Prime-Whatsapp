import { getDb, saveMessage, updateMemorySummary, getUserMemory } from '../firebase/index.js';
import { matchCommand } from '../commands/index.js';
import { buildPrompt } from '../memory/index.js';
import { generateReply } from '../ai/index.js';
import { messageQueue } from '../utils/queue.js';
import { config } from '../config/index.js';

export function setupHandlers(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });
}

async function handleMessage(sock, msg) {
  if (msg.key?.fromMe) return;

  const text = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || '';

  if (!text.trim()) return;

  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const pushName = msg.pushName || 'User';

  if (!jid) return;

  const isGroup = jid.endsWith('@g.us');
  const isMentioned = isGroup
    ? text.includes(`@${sock.user.id.split(':')[0]}`)
    : true;

  if (isGroup && !isMentioned) return;

  const db = getDb();
  const cleanText = isGroup
    ? text.replace(/@\S+/g, '').trim()
    : text;

  await saveMessage(sender, 'user', cleanText);

  const cmd = matchCommand(cleanText);
  if (cmd) {
    const reply = await cmd.handler(sender);
    await sendTypingReply(sock, jid, reply, msg.key);
    await saveMessage(sender, 'assistant', reply);
    return;
  }

  await messageQueue.add(async () => {
    if (db) {
      const prompt = await buildPrompt(sender, pushName, cleanText);
      const reply = await generateReply(prompt);
      await sendTypingReply(sock, jid, reply, msg.key);
      await saveMessage(sender, 'assistant', reply);

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
        await updateMemorySummary(sender, finalSummary);
      } else {
        const newSummary = await generateReply(
          `Create a short memory summary about this user in under 15 words:\nUser said: ${cleanText}`
        );
        await updateMemorySummary(sender, newSummary);
      }
    } else {
      const prompt = await buildPrompt(sender, pushName, cleanText);
      const reply = await generateReply(prompt);
      await sendTypingReply(sock, jid, reply, msg.key);
      await saveMessage(sender, 'assistant', reply);
    }
  });
}

async function sendTypingReply(sock, jid, text, quotedKey) {
  await sock.sendPresenceUpdate('composing', jid);
  await sleep(getTypingDelay(text));
  await sock.sendMessage(jid, { text }, { quoted: quotedKey });
  await sock.sendPresenceUpdate('paused', jid);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getTypingDelay(text) {
  const base = text.length * 30;
  return Math.min(Math.max(base, 500), 3000);
}
