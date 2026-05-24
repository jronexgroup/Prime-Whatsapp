import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { config } from '../config/index.js';

let currentSock = null;
let onReconnect = null;
let reconnectAttempt = 0;

export function getSocket() {
  return currentSock;
}

export function setReconnectHandler(handler) {
  onReconnect = handler;
}

export async function createSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(config.session.dir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log('Baileys version:', version.join('.'), '(latest:', isLatest, ')');

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Prime WhatsApp', 'Chrome', '120.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });

  currentSock = sock;
  reconnectAttempt = 0;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan this QR code with your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n📍 Open WhatsApp → Linked Devices → Link a Device\n');

      QRCode.toFile(resolve('qr.png'), qr, { type: 'png', width: 400 }, (err) => {
        if (!err) console.log('💾 QR saved as qr.png');
      });

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
      console.log('\n🌐 Or open this link in your browser to scan:');
      console.log(qrUrl + '\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message || 'Unknown';
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed:', statusCode, errorMsg);

      if (shouldReconnect) {
        reconnectAttempt++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        console.log(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempt})...`);
        setTimeout(async () => {
          await createSocket();
          if (onReconnect) onReconnect(currentSock);
        }, delay);
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }
  });

  return sock;
}
