import { updateMemorySummary, getUserMemory } from '../firebase/index.js';
import { config } from '../config/index.js';

const prefix = config.bot.prefix;

export const commands = {
  [`${prefix}help`]: {
    desc: 'Show available commands',
    handler: async () => {
      return `*${config.bot.name} Commands*
${prefix}help — Show this message
${prefix}ping — Check if bot is alive
${prefix}resetmemory — Reset your memory
${prefix}summary — Show your memory summary
${prefix}owner — Contact the owner`;
    },
  },

  [`${prefix}ping`]: {
    desc: 'Check bot status',
    handler: async () => 'pong!',
  },

  [`${prefix}resetmemory`]: {
    desc: 'Reset your memory',
    handler: async (jid) => {
      await updateMemorySummary(jid, '');
      return 'Your memory has been reset.';
    },
  },

  [`${prefix}summary`]: {
    desc: 'Show your memory summary',
    handler: async (jid) => {
      const memory = await getUserMemory(jid);
      const summary = memory.summary || 'No memory stored yet.';
      return `*Your Memory Summary:*\n${summary}`;
    },
  },

  [`${prefix}owner`]: {
    desc: 'Contact the owner',
    handler: async () => {
      return config.bot.ownerNumber
        ? `Owner: wa.me/${config.bot.ownerNumber}`
        : 'Owner not set.';
    },
  },
};

export function matchCommand(text) {
  if (!text || !text.startsWith(prefix)) return null;
  const cmd = commands[text.toLowerCase().trim()];
  return cmd || null;
}
