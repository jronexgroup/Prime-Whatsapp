import { getUserProfile, getUserMemory, getRecentMessages } from '../firebase/index.js';
import { config } from '../config/index.js';

export async function buildPrompt(jid, userName, incomingMessage) {
  const profile = await getUserProfile(jid);
  const memory = await getUserMemory(jid);
  const recentMessages = await getRecentMessages(jid, config.memory.maxMessages);

  const name = profile.name || userName || 'User';
  const language = profile.language || 'English';
  const tone = profile.tone || 'casual';
  const relationship = profile.relationship || 'friend';
  const summary = memory.summary || 'New user';

  const historyStr = recentMessages
    .map((m) => `${m.role === 'user' ? name : config.bot.name}: ${m.text}`)
    .join('\n');

  const prompt = `You are ${config.bot.name} WhatsApp AI.
Your job is to reply naturally like a real human.

User Name: ${name}
Relationship: ${relationship}
Preferred Language: ${language}
Reply Style: ${tone}
About User: ${summary}

Rules:
- Avoid robotic replies
- Be concise
- Match the user's language
- Maintain conversational continuity
- Do not use markdown formatting
- Keep replies short and natural

Recent conversation:
${historyStr}

${name}: ${incomingMessage}
${config.bot.name}:`;

  return prompt;
}
