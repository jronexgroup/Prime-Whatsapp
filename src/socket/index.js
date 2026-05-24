import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { resolve } from 'path';
import { config } from '../config/index.js';
import { setState, setQR } from '../server.js';

let currentSock = null;
let onReconnect = null;
let reconnectAttempt = 0;
let reconnecting = false;

export function getSocket() {
  return currentSock;
}

export function setReconnectHandler(handler) {
  onReconnect = handler;
}

export async function createSocket() {
  if (reconnecting) {
    console.log('Already reconnecting, skipping...');
    return currentSock;
  }

  if (currentSock) {
    try {
      currentSock.removeAllListeners();
      currentSock.end();
    } catch {}
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.session.dir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log('Baileys version:', version.join('.'), '(latest:', isLatest, ')');

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'fatal' }),
    browser: ['Prime WhatsApp', 'Chrome', '120.0'],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    keepAliveIntervalMs: 25000,
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
      console.log('\n📍 Open WhatsApp → Linked Devices → Link a Device\n');

      QRCode.toFile(resolve('qr.png'), qr, { type: 'png', width: 400 }, (err) => {
        if (!err) console.log('💾 QR saved as qr.png');
      });

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
      console.log('\n🌐 Or open /qr page in your browser:');
      console.log(`http://localhost:${process.env.PORT || 3000}/qr\n`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message || 'Unknown';
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log('Connection closed:', statusCode, errorMsg);

      if (!isLoggedOut) {
        reconnectAttempt++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        const maxAttempts = 20;
        if (reconnectAttempt > maxAttempts) {
          console.log(`Max reconnect attempts (${maxAttempts}) reached. Stopping. Restart the bot manually.`);
          return;
        }
        console.log(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempt}/${maxAttempts})...`);
        reconnecting = true;
        setTimeout(async () => {
          try {
            await createSocket();
            if (onReconnect) onReconnect(currentSock);
          } catch (err) {
            console.error('Reconnect failed:', err.message);
            reconnecting = false;
          }
        }, delay);
      }
    }

    if (connection === 'open') {
      reconnectAttempt = 0;
      console.log('✅ WhatsApp connected!');
    }
  });

  return sock;
}
