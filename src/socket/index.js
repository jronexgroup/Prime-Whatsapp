import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { config } from '../config/index.js';

let currentSock = null;
let onReconnect = null;

export function getSocket() {
  return currentSock;
}

export function setReconnectHandler(handler) {
  onReconnect = handler;
}

export async function createSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(config.session.dir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['Prime WhatsApp', 'Chrome', '120.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  currentSock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('Scan the QR code above with your WhatsApp');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log('Connection closed:', reason);

      if (shouldReconnect) {
        console.log('Reconnecting in 5s...');
        setTimeout(async () => {
          await createSocket();
          if (onReconnect) onReconnect(currentSock);
        }, 5000);
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp connected!');
    }
  });

  return sock;
}
