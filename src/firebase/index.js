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

  const url = `${FIRESTORE_URL}/${path}`;
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
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: val.toString() };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'object') fields[key] = { mapValue: { fields: objToFields(val) } };
  }
  return fields;
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
  const result = await api(
    `users/${encodeURIComponent(jid)}/messages?pageSize=${limit}&orderBy=timestamp desc`
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
  const existing = await api(`users/${encodeURIComponent(jid)}`);
  const fields = existing?.fields || {};
  fields.profile = { mapValue: { fields: objToFields(profile) } };

  await api(`users/${encodeURIComponent(jid)}?updateMask.fieldPaths=profile`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

export async function updateMemorySummary(jid, summary) {
  if (!db) return;
  const existing = await api(`users/${encodeURIComponent(jid)}`);
  const fields = existing?.fields || {};
  fields.memory = { mapValue: { fields: objToFields({ summary }) } };

  await api(`users/${encodeURIComponent(jid)}?updateMask.fieldPaths=memory`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}
