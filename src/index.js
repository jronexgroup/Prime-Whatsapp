import { createSocket, setReconnectHandler } from './socket/index.js';
import { setupHandlers } from './handlers/index.js';
import { initFirebase } from './firebase/index.js';
import { initAI } from './ai/index.js';

console.log('Starting Prime WhatsApp...');

initFirebase();
initAI();

const sock = await createSocket();
setupHandlers(sock);

setReconnectHandler((newSock) => {
  console.log('Reattaching handlers...');
  setupHandlers(newSock);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled:', err.message);
});
