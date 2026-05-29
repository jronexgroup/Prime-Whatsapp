import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

const PROJECT_ID = 'cousin-hub';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let db = null;
let tokenData = null;

function loadTokens() {
  const configPath = resolve(homedir(), '.config/configstore/firebase-tools.json');
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw).tokens || null;
  } catch {
    return null;
  }
}

async function getValidToken() {
  tokenData = tokenData || loadTokens();
  if (!tokenData) return null;

  if (Date.now() >= tokenData.expires_at) {
    await refreshToken();
  }
  return tokenData.access_token;
}

async function refreshToken() {
  try {
    const res = await fetch('https://securetoken.googleapis.com/v1/token?key=AIzaSyB4pR7TfAcFId8lBPZyfQDvPkMnY4I2JYc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      tokenData.access_token = data.access_token;
      tokenData.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
    }
  } catch (err) {
    console.warn('Token refresh failed:', err.message);
  }
}

async function api(path, opts = {}) {
  const token = await getValidToken();
  if (!token) return null;

  const separator = path.startsWith(':') ? '' : '/';
  const url = `${FIRESTORE_URL}${separator}${path}`;
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
    if (res.status !== 404) {
      console.warn(`Firestore API error ${res.status}:`, body.substring(0, 200));
    }
    return null;
  }
  if (res.status === 204) return true;
  return res.json();
}

function docToObj(doc) {
  if (!doc) return {};
  const fields = doc.mapValue?.fields || doc.fields;
  if (!fields) return {};
  const obj = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) obj[key] = val.stringValue;
    else if (val.integerValue !== undefined) obj[key] = parseInt(val.integerValue);
    else if (val.booleanValue !== undefined) obj[key] = val.booleanValue;
    else if (val.mapValue) obj[key] = docToObj(val.mapValue);
    else if (val.arrayValue) obj[key] = (val.arrayValue.values || []).map((v) => docToObj(v.mapValue || v));
  }
  return obj;
}

function objToFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: val.toString() };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'object' && !Array.isArray(val)) fields[key] = { mapValue: { fields: objToFields(val) } };
    else if (Array.isArray(val)) fields[key] = { arrayValue: { values: val.map(v => ({ stringValue: String(v) })) } };
  }
  return fields;
}

function makeDoc(name, data) {
  return { name, fields: objToFields(data) };
}

export function initFirebase() {
  const tokens = loadTokens();
  if (!tokens) {
    console.warn('Firebase CLI tokens not found — memory features disabled');
    return null;
  }
  tokenData = tokens;
  db = {};
  console.log('Firebase connected (project:', PROJECT_ID + ')');
  return db;
}

export function getDb() {
  return db;
}

async function listCollection(collectionPath, opts = {}) {
  const parts = collectionPath.split('/');
  let parent = '';
  let collectionId = parts[parts.length - 1];
  if (parts.length > 1) {
    parent = parts.slice(0, -1).join('/');
  }

  const params = new URLSearchParams();
  params.set('collectionId', collectionId);
  if (opts.pageSize) params.set('pageSize', opts.pageSize);
  if (opts.orderBy) params.set('orderBy', opts.orderBy);
  if (parent) params.set('parent', `projects/${PROJECT_ID}/databases/(default)/documents/${parent}`);

  return api(`:listDocuments?${params.toString()}`, { method: 'POST' });
}

// ── Users ──

export async function getUserProfile(jid) {
  if (!db) return null;
  const doc = await api(`users/${encodeURIComponent(jid)}`);
  if (!doc || !doc.fields) return {};
  return docToObj(doc).profile || {};
}

export async function getUserMemory(jid) {
  if (!db) return null;
  const doc = await api(`users/${encodeURIComponent(jid)}`);
  if (!doc || !doc.fields) return {};
  return docToObj(doc).memory || {};
}

export async function getRecentMessages(jid, limit = 20) {
  if (!db) return [];
  const result = await listCollection(
    `users/${encodeURIComponent(jid)}/messages`,
    { pageSize: limit, orderBy: 'timestamp desc' }
  );
  if (!result || !result.documents) return [];
  const msgs = result.documents.map((d) => docToObj(d));
  return msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

export async function saveMessage(jid, role, text) {
  if (!db) return;
  await api(`users/${encodeURIComponent(jid)}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        role: { stringValue: role },
        text: { stringValue: text.substring(0, 1000) },
        timestamp: { integerValue: Date.now().toString() },
      },
    }),
  });
}

export async function updateProfile(jid, profile) {
  if (!db) return;
  await api(`users/${encodeURIComponent(jid)}?updateMask.fieldPaths=profile`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        profile: { mapValue: { fields: objToFields(profile) } }
      },
    }),
  });
}

export async function updateMemorySummary(jid, summary) {
  if (!db) return;
  await api(`users/${encodeURIComponent(jid)}?updateMask.fieldPaths=memory`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        memory: { mapValue: { fields: objToFields({ summary }) } }
      },
    }),
  });
}

export async function listUsers() {
  if (!db) return [];
  const result = await listCollection('users', { pageSize: 100 });
  if (!result || !result.documents) return [];
  return result.documents.map((doc) => {
    const obj = docToObj(doc);
    const jid = decodeURIComponent(doc.name.split('/').pop());
    return { jid, ...obj };
  });
}

// ── Broadcasts ──

export async function listBroadcasts() {
  if (!db) return [];
  const result = await listCollection('broadcasts', { pageSize: 100 });
  if (!result || !result.documents) return [];
  return result.documents.map((doc) => {
    const obj = docToObj(doc);
    obj.id = doc.name.split('/').pop();
    return obj;
  });
}

export async function createBroadcast(data) {
  if (!db) return null;
  const result = await api('broadcasts', {
    method: 'POST',
    body: JSON.stringify(makeDoc(null, data)),
  });
  if (!result) return null;
  return { id: result.name.split('/').pop(), ...data };
}

export async function updateBroadcast(id, data) {
  if (!db) return false;
  const ok = await api(`broadcasts/${id}?updateMask.fieldPaths=${Object.keys(data).join(',')}`, {
    method: 'PATCH',
    body: JSON.stringify(makeDoc(null, data)),
  });
  return !!ok;
}

export async function deleteBroadcast(id) {
  if (!db) return false;
  const ok = await api(`broadcasts/${id}`, { method: 'DELETE' });
  return !!ok;
}

// ── Tasks ──

export async function listTasks() {
  if (!db) return [];
  const result = await listCollection('tasks', { pageSize: 100 });
  if (!result || !result.documents) return [];
  return result.documents.map((doc) => {
    const obj = docToObj(doc);
    obj.id = doc.name.split('/').pop();
    return obj;
  });
}

export async function createTask(data) {
  if (!db) return null;
  const result = await api('tasks', {
    method: 'POST',
    body: JSON.stringify(makeDoc(null, data)),
  });
  if (!result) return null;
  return { id: result.name.split('/').pop(), ...data };
}

export async function updateTask(id, data) {
  if (!db) return false;
  const ok = await api(`tasks/${id}?updateMask.fieldPaths=${Object.keys(data).join(',')}`, {
    method: 'PATCH',
    body: JSON.stringify(makeDoc(null, data)),
  });
  return !!ok;
}

export async function deleteTask(id) {
  if (!db) return false;
  const ok = await api(`tasks/${id}`, { method: 'DELETE' });
  return !!ok;
}

// ── Prompts ──

export async function listPrompts() {
  if (!db) return [];
  const result = await listCollection('prompts', { pageSize: 100 });
  if (!result || !result.documents) return [];
  return result.documents.map((doc) => {
    const obj = docToObj(doc);
    obj.id = doc.name.split('/').pop();
    return obj;
  });
}

export async function createPrompt(data) {
  if (!db) return null;
  const result = await api('prompts', {
    method: 'POST',
    body: JSON.stringify(makeDoc(null, data)),
  });
  if (!result) return null;
  return { id: result.name.split('/').pop(), ...data };
}

export async function updatePrompt(id, data) {
  if (!db) return false;
  const fieldPaths = Object.keys(data).join(',');
  const ok = await api(`prompts/${id}?updateMask.fieldPaths=${fieldPaths}`, {
    method: 'PATCH',
    body: JSON.stringify(makeDoc(null, data)),
  });
  return !!ok;
}

export async function deletePrompt(id) {
  if (!db) return false;
  const ok = await api(`prompts/${id}`, { method: 'DELETE' });
  return !!ok;
}

const SEED_PROMPTS = [
  {
    name: 'system_prompt',
    category: 'system',
    content: `You are ${process.env.BOT_NAME || 'Prime'} talking to a friend. Reply in the EXACT same language as the friend.

Friend writes Banglish (Bengali in roman letters):
  "kemon acho?"  ->  "bhalo achi, tumi kemon?"
  "ki korcho?"   ->  "kisu na, just chill korchi"
  "kalke ghurte jabi?"  ->  "haan jabo, kothay jabo?"
  "ei sob ki bolchis?"  ->  "ar kichu na, just fun korchi"

Friend writes English -> reply English. Friend writes Hinglish -> reply Hinglish.

NEVER use Bengali/Hindi Unicode (ো, ই, आ, इ). Only a-z roman letters.
Be natural, 1-3 sentences, never repeat their question, no honorifics like didi/bhai/sir.`,
    description: 'Main system instruction sent to the AI model before every conversation',
    active: true,
  },
  {
    name: 'prompt_template',
    category: 'template',
    content: 'Detected Language: {language}\n\nConversation so far:\n{context}\n\n{userName}: {message}\n{botName}:',
    description: 'Template used to build the final prompt sent to the AI (placeholders: {language}, {context}, {userName}, {message}, {botName})',
    active: true,
  },
  {
    name: 'banglish_words',
    category: 'language_detection',
    content: 'ami, tumi, amake, tomake, amra, tomra, tui, tore, toke, amader, tomader, amar, tomar, apni, apnar, kemon, keno, kothay, kothao, kobe, kalke, ki, ke, jacchi, jabo, jabi, jabe, jai, jawa, jaben, jete, korchi, korbo, koro, korcho, koren, korte, kore, bolchi, bolbo, bol, bole, bollo, bolche, bolchis, dekhchi, dekhte, dekha, dekhbo, dekhbe, bujhli, bujhlam, bujhi, bujhe, bujhecho, aschi, asche, asbo, ashbe, ashche, thaki, thakbo, thakbe, thakte, thik, dite, diye, dewa, dakche, dakbe, dakbo, dakchis, niye, nibo, nichi, nischa, pari, pare, parbo, parbe, parchi, parte, lagbe, lage, laglo, lagche, janina, jani, jana, janam, ache, nai, chilo, hobe, hocche, hoy, hoyto, hoyni, valo, bhalo, kharap, mana, mane, manush, ajke, eibar, abar, tahole, kichu, shob, sob, kono, kokhon, shune, shona, shunte, roilo, roibe, rokom, theke, dhore, dhor, nijer, para, parte, partam, ei, eita, eishob, okhane, tokhane, ekhane, jatse, jaitese, mone, mon, bhai, mama, sathe, sunbo, sunlam, kaaj, kotha, raat, din, kal, chai, chara, charbo, markha, mar, na, o, ar, aacha, accha, thikache, bangla, desh, sona, baba, bon, kaka',
    description: 'Banglish keywords used for language detection scoring (comma-separated)',
    active: true,
  },
  {
    name: 'hindi_words',
    category: 'language_detection',
    content: 'main, tum, aap, maine, tumne, aapne, kaise, kya, kahan, kab, kyun, kaun, hoon, ho, hai, hain, tha, thi, the, honga, sakta, sakti, sakte, achha, theek, nahi, mera, meri, tera, teri, aapka, tumhara, apna, karta, karti, karte, karna, kar, karne, chahiye, chahta, chahti, chahte, liye, ke, ko, se, mein, pe, par, aaj, abhi, ab, phir, bhi, hi, raha, rahi, rahe, rahega, sir, sahab, mujhe, tujhe, humein, unka, inka, waise, aisa, kaisa',
    description: 'Hindi keywords used for language detection scoring (comma-separated)',
    active: true,
  },
  {
    name: 'language_rules',
    category: 'language_detection',
    content: 'Banglish suffixes (weight +4): -chi, -chhi, -chis, -che, -cho, -bo, -lam, -li\nBanglish suffixes (weight +2): -lo, -be, -le\nHindi suffixes (weight +4): -ta, -ti, -te, -tu, -oon, -ein, -ain, -oge, -ega\nWord match weight: +3 per match\nThreshold: score >= 2 to classify, ties broken at >= 4 favor Banglish',
    description: 'Rules for language detection: suffix patterns, weights, and scoring thresholds',
    active: true,
  },
];

export async function seedPrompts() {
  if (!db) return;
  const existing = await listPrompts();
  if (existing.length > 0) return;
  for (const p of SEED_PROMPTS) {
    await api('prompts', {
      method: 'POST',
      body: JSON.stringify(makeDoc(null, p)),
    });
  }
  const count = SEED_PROMPTS.length;
  console.log(`Seeded ${count} prompts to Firestore`);
}

// ── Bot Config ──

export async function getBotConfig() {
  if (!db) return null;
  const doc = await api('config/bot');
  if (!doc || !doc.fields) return null;
  return docToObj(doc);
}

export async function updateBotConfig(config) {
  if (!db) return false;
  const fieldPaths = Object.keys(config).join(',');
  const ok = await api(`config/bot?updateMask.fieldPaths=${fieldPaths}`, {
    method: 'PATCH',
    body: JSON.stringify(makeDoc(null, config)),
  });
  return !!ok;
}
