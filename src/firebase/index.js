import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config/index.js';

let db;

export function initFirebase() {
  const { projectId, clientEmail, privateKey } = config.firebase;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase credentials missing — memory features disabled');
    return null;
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  db = getFirestore(app);
  console.log('Firebase connected');
  return db;
}

export function getDb() {
  return db;
}

export async function getUserProfile(jid) {
  if (!db) return null;
  const snap = await db.collection('users').doc(jid).get();
  return snap.exists ? snap.data().profile || {} : {};
}

export async function getUserMemory(jid) {
  if (!db) return null;
  const snap = await db.collection('users').doc(jid).get();
  return snap.exists ? snap.data().memory || {} : {};
}

export async function getRecentMessages(jid, limit = 20) {
  if (!db) return [];
  const snap = await db
    .collection('users')
    .doc(jid)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => d.data()).reverse();
}

export async function saveMessage(jid, role, text) {
  if (!db) return;
  const msgRef = db
    .collection('users')
    .doc(jid)
    .collection('messages')
    .doc();

  await msgRef.set({
    role,
    text,
    timestamp: Date.now(),
  });
}

export async function updateProfile(jid, profile) {
  if (!db) return;
  await db
    .collection('users')
    .doc(jid)
    .set({ profile }, { merge: true });
}

export async function updateMemorySummary(jid, summary) {
  if (!db) return;
  await db
    .collection('users')
    .doc(jid)
    .set({ memory: { summary } }, { merge: true });
}
