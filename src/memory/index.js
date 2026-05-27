import { getUserProfile, getUserMemory } from '../firebase/index.js';
import { config } from '../config/index.js';

function detectLanguage(text) {
  let hasBengaliScript = false;
  let hasHindiScript = false;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x0980 && code <= 0x09FF) hasBengaliScript = true;
    if (code >= 0x0900 && code <= 0x097F) hasHindiScript = true;
    if (code >= 0x0600 && code <= 0x06FF) return 'Arabic';
    if (code >= 0x0400 && code <= 0x04FF) return 'Russian';
    if (code >= 0x0B80 && code <= 0x0BFF) return 'Tamil';
  }
  if (hasBengaliScript) return 'Bengali';
  if (hasHindiScript) return 'Hindi';

  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  let bnScore = 0;
  let hiScore = 0;

  for (const w of words) {
    if (w.endsWith('chi') || w.endsWith('chhi') || w.endsWith('chis') || w.endsWith('che') || w.endsWith('cho')) bnScore += 4;
    if (w.endsWith('bo') || w.endsWith('lam') || w.endsWith('li')) bnScore += 4;
    if (w.endsWith('lo')) bnScore += 2;
    if (w.endsWith('be') || w.endsWith('le')) bnScore += 2;
    if (w.endsWith('ta') || w.endsWith('ti') || w.endsWith('te') || w.endsWith('tu')) hiScore += 4;
    if (w.endsWith('oon') || w.endsWith('ein') || w.endsWith('ain') || w.endsWith('oge') || w.endsWith('ega')) hiScore += 4;
  }

  const bengaliWords = [
    'ami', 'tumi', 'amake', 'tomake', 'amra', 'tomra', 'tui', 'tore', 'toke', 'amader', 'tomader', 'amar', 'tomar', 'apni', 'apnar',
    'kemon', 'keno', 'kothay', 'kothao', 'kobe', 'kalke', 'ki', 'ke',
    'jacchi', 'jabo', 'jabi', 'jabe', 'jai', 'jawa', 'jaben', 'jete',
    'korchi', 'korbo', 'koro', 'korcho', 'koren', 'korte', 'kore',
    'bolchi', 'bolbo', 'bol', 'bole', 'bollo', 'bolche', 'bolchis',
    'dekhchi', 'dekhte', 'dekha', 'dekhbo', 'dekhbe',
    'bujhli', 'bujhlam', 'bujhi', 'bujhe', 'bujhecho',
    'aschi', 'asche', 'asbo', 'ashbe', 'ashche',
    'thaki', 'thakbo', 'thakbe', 'thakte', 'thik',
    'dite', 'diye', 'dewa',
    'dakche', 'dakbe', 'dakbo', 'dakchis',
    'niye', 'nibo', 'nichi', 'nischa',
    'pari', 'pare', 'parbo', 'parbe', 'parchi', 'parte',
    'lagbe', 'lage', 'laglo', 'lagche',
    'janina', 'jani', 'jana', 'janam',
    'ache', 'nai', 'chilo',
    'hobe', 'hocche', 'hoy', 'hoyto', 'hoyni',
    'valo', 'bhalo', 'kharap',
    'mana', 'mane', 'manush',
    'ajke', 'eibar', 'abar', 'tahole',
    'kichu', 'shob', 'sob', 'kono', 'kokhon',
    'shune', 'shona', 'shunte',
    'roilo', 'roibe', 'rokom',
    'theke', 'dhore', 'dhor',
    'nijer', 'para', 'parte', 'partam',
    'ei', 'eita', 'eishob', 'okhane', 'tokhane', 'ekhane',
    'jatse', 'jaitese',
    'mone', 'mon', 'bhai', 'mama',
    'sathe', 'sunbo', 'sunlam',
    'kaaj', 'kotha', 'raat', 'din', 'kal',
    'chai', 'chara', 'charbo',
    'markha', 'mar',
    'na', 'o', 'ar',
    'aacha', 'accha', 'thikache',
    'bangla', 'desh', 'sona', 'baba', 'bon', 'kaka',
  ];
  const hindiWords = [
    'main', 'tum', 'aap', 'maine', 'tumne', 'aapne',
    'kaise', 'kya', 'kahan', 'kab', 'kyun', 'kaun',
    'hoon', 'ho', 'hai', 'hain', 'tha', 'thi', 'the', 'honga',
    'sakta', 'sakti', 'sakte',
    'achha', 'theek', 'nahi',
    'mera', 'meri', 'tera', 'teri', 'aapka', 'tumhara', 'apna',
    'karta', 'karti', 'karte', 'karna', 'kar', 'karne',
    'chahiye', 'chahta', 'chahti', 'chahte',
    'liye', 'ke', 'ko', 'se', 'mein', 'pe', 'par',
    'aaj', 'abhi', 'ab', 'phir', 'bhi', 'hi',
    'raha', 'rahi', 'rahe', 'rahega',
    'sir', 'sahab', 'mujhe', 'tujhe', 'humein',
    'unka', 'inka', 'waise', 'aisa', 'kaisa', 'kya',
  ];

  for (const w of words) {
    if (bengaliWords.includes(w)) bnScore += 3;
    if (hindiWords.includes(w)) hiScore += 3;
  }

  if (bnScore > hiScore && bnScore >= 2) return 'Banglish';
  if (hiScore > bnScore && hiScore >= 2) return 'Hinglish';
  if (bnScore === hiScore && bnScore >= 4) return 'Banglish';
  if (bnScore === hiScore && hiScore >= 4) return 'Hinglish';
  return 'English';
}

export async function buildPrompt(jid, userName, incomingMessage) {
  const profile = (await getUserProfile(jid)) || {};
  const memory = (await getUserMemory(jid)) || {};

  const name = profile.name || userName || 'User';
  const detectedLang = detectLanguage(incomingMessage);
  const context = memory.context || '';

  const prompt = `Detected Language: ${detectedLang}

Conversation so far:
${context}

${name}: ${incomingMessage}
${config.bot.name}:`;

  return prompt;
}
