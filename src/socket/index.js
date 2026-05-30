import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { resolve } from 'path';
import { rmSync, existsSync, readdirSync } from 'fs';
import { setState, setQR } from '../server.js';

let currentSock = null;
let onReconnect = null;
let reconnectAttempt = 0;
let creating = false;
let sessionCleared = false;

const contactsCache = new Map();

export function getSocket() {
  return currentSock;
}

export function setReconnectHandler(handler) {
  onReconnect = handler;
}

export function getContacts() {
  return [...contactsCache.values()];
}

export function getContact(jid) {
  return contactsCache.get(jid);
}

export function isLid(jid) {
  return jid.endsWith('@lid');
}

export function extractPhone(jid) {
  if (jid.endsWith('@s.whatsapp.net')) return jid.split('@')[0];
  if (jid.endsWith('@lid')) {
    const c = contactsCache.get(jid);
    if (c) return c.id?.split('@')[0] || null;
  }
  return null;
}

function clearSession() {
  const dir = 'sessions';
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) rmSync(`${dir}/${f}`, { recursive: true, force: true });
  }
  sessionCleared = true;
  console.log('[!] Session cleared. Fresh QR will be shown...');
}

export async function createSocket() {
  if (creating) return currentSock;
  creating = true;

  if (currentSock) {
    try { currentSock.removeAllListeners(); currentSock.end(); } catch {}
    currentSock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState('sessions');

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📡 WA Version: ${version.join('.')} (latest: ${isLatest})`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'fatal' }),
    browser: ['Prime WhatsApp', 'Chrome', '120.0'],
    syncFullHistory: true,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('contacts.set', ({ contacts }) => {
    contacts.forEach(c => contactsCache.set(c.id, c));
    console.log(`[Contacts] Initial set: ${contacts.length} contacts loaded`);
  });

  sock.ev.on('contacts.upsert', (contacts) => {
    contacts.forEach(c => contactsCache.set(c.id, c));
  });

  sock.ev.on('contacts.update', (updates) => {
    updates.forEach(u => {
      const existing = contactsCache.get(u.id);
      if (existing) contactsCache.set(u.id, { ...existing, ...u });
    });
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    setState(qr ? 'scan_qr' : connection);

    if (qr) {
      sessionCleared = false;
      reconnectAttempt = 0;
      setQR(qr);
      console.log('\n' + '='.repeat(50));
      console.log('📱 SCAN THIS QR WITH YOUR WHATSAPP');
      console.log('='.repeat(50) + '\n');
      qrcode.generate(qr, { small: true });
      console.log('\n📍 WhatsApp → Linked Devices → Link a Device\n');

      QRCode.toFile(resolve('qr.png'), qr, { type: 'png', width: 400 }, (err) => {
        if (err) console.error('[!] QR file write failed:', err.message);
      });
      console.log(`🌐 Open http://localhost:${process.env.PORT || 3000}/qr to view QR\n`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message || '';
      const isLogout = statusCode === DisconnectReason.loggedOut;

      console.log(`[!] Disconnected: code=${statusCode} ${errorMsg.substring(0,80)}`);

      if (isLogout || statusCode === 405) {
        if (!sessionCleared) {
          console.log('[!] Session rejected by server. Clearing & showing fresh QR...');
          clearSession();
          reconnectAttempt = 0;
          setTimeout(async () => {
            await createSocket();
            if (onReconnect) onReconnect(currentSock);
          }, 1000);
          return;
        }
        console.log('[!] Session still rejected. Try a different network or VPN.');
        return;
      }

      if (reconnectAttempt < 15) {
        reconnectAttempt++;
        const delay = Math.min(5000 * reconnectAttempt, 60000);
        console.log(`[>] Reconnecting in ${delay/1000}s (#${reconnectAttempt})...\n`);
        setTimeout(async () => {
          try {
            await createSocket();
            if (onReconnect) onReconnect(currentSock);
          } catch (err) {
            console.error('[!] Reconnect error:', err?.message || err);
          }
        }, delay);
      } else {
        console.log('[!] Failed after 15 tries. Run: npm run fix && npm start');
      }
    }

    if (connection === 'open') {
      reconnectAttempt = 0;
      sessionCleared = false;
      console.log('✅ WhatsApp connected!');
      if (onReconnect) onReconnect(sock);
    }
  });

  currentSock = sock;
  creating = false;

  return sock;
}
