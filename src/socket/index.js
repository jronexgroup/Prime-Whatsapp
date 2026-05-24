import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { resolve } from 'path';
import { existsSync, rmSync } from 'fs';
import { config } from '../config/index.js';
import { setState, setQR } from '../server.js';

let currentSock = null;
let onReconnect = null;
let reconnectAttempt = 0;
let reconnecting = false;
let strategyIndex = 0;

const CONNECT_STRATEGIES = [
  {
    label: 'default',
    markOnlineOnConnect: false,
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
  },
  {
    label: 'aggressive-keepalive',
    markOnlineOnConnect: true,
    keepAliveIntervalMs: 15000,
    connectTimeoutMs: 30000,
  },
  {
    label: 'minimal',
    markOnlineOnConnect: false,
    keepAliveIntervalMs: 0,
    connectTimeoutMs: 90000,
  },
];

const VERSIONS = [
  null,
  [2, 3000, 1015901307],
  [2, 2407, 3],
  [2, 2400, 1],
];

export function getSocket() {
  return currentSock;
}

export function setReconnectHandler(handler) {
  onReconnect = handler;
}

export async function createSocket() {
  if (reconnecting) return currentSock;

  if (currentSock) {
    try { currentSock.removeAllListeners(); currentSock.end(); } catch {}
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.session.dir);
  const strategy = CONNECT_STRATEGIES[strategyIndex % CONNECT_STRATEGIES.length];
  const versionIdx = Math.floor(strategyIndex / CONNECT_STRATEGIES.length) % VERSIONS.length;
  const chosenVersion = VERSIONS[versionIdx];

  let version;
  if (chosenVersion) {
    version = chosenVersion;
  } else {
    try {
      const v = await fetchLatestBaileysVersion();
      version = v.version;
    } catch {
      version = [2, 3000, 1015901307];
    }
  }

  console.log(`\n🔌 Connecting (strategy: ${strategy.label}, v${version.join('.')})...`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'fatal' }),
    browser: ['Prime WhatsApp', 'Chrome', '120.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: strategy.markOnlineOnConnect,
    keepAliveIntervalMs: strategy.keepAliveIntervalMs,
    connectTimeoutMs: strategy.connectTimeoutMs,
    fireInitQueries: true,
    shouldIgnoreMessage: () => false,
    emitOwnEvents: false,
    downloadHistory: false,
    transactionOpts: { maxCommitRetries: 3, delayBetweenTriesMs: 100 },
  });

  currentSock = sock;
  reconnecting = false;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    setState(qr ? 'awaiting_scan' : connection);

    if (qr) {
      setQR(qr);
      console.log('\n📱 Scan this QR code with your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n📍 WhatsApp → Linked Devices → Link a Device\n');

      QRCode.toFile(resolve('qr.png'), qr, { type: 'png', width: 400 }, (err) => {
        if (!err) console.log('💾 QR also saved as qr.png\n');
      });

      console.log(`🌐 Open http://localhost:${process.env.PORT || 3000}/qr in browser to scan\n`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message || 'Unknown';
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`❌ Disconnected: ${statusCode} ${errorMsg}`);

      if (isLoggedOut) {
        console.log('🚫 Logged out. Clear sessions and restart:\n   rm -rf sessions/ && npm start');
        return;
      }

      reconnectAttempt++;
      strategyIndex++;

      const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempt), 60000);

      if (reconnectAttempt <= 15) {
        console.log(`⏳ Retrying in ${Math.round(delay/1000)}s (attempt ${reconnectAttempt}/15, ${strategy.label})...\n`);
        reconnecting = true;
        setTimeout(async () => {
          try {
            await createSocket();
            if (onReconnect) onReconnect(currentSock);
          } catch (err) {
            console.error('Reconnect error:', err.message);
            reconnecting = false;
          }
        }, delay);
      } else {
        console.log('❌ Failed after 15 attempts. Run this:\n   npm run fix && npm start');
      }
    }

    if (connection === 'open') {
      reconnectAttempt = 0;
      strategyIndex = 0;
      console.log('✅ WhatsApp connected!');
    }
  });

  return sock;
}
