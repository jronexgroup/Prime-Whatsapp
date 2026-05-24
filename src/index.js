import { createSocket, setReconnectHandler, getSocket } from './socket/index.js';
import { setupHandlers } from './handlers/index.js';
import { initFirebase } from './firebase/index.js';
import { initAI } from './ai/index.js';
import { startServer, setState } from './server.js';

console.log('Starting Prime WhatsApp...');
console.log('Stop anytime with: Ctrl+C (or npm run stop)');

startServer();
initFirebase();
initAI();

const sock = await createSocket();
setupHandlers(sock);

setReconnectHandler((newSock) => {
  console.log('Reattaching handlers...');
  setupHandlers(newSock);
});

function shutdown() {
  console.log('\nShutting down Prime WhatsApp...');
  const s = getSocket();
  if (s) {
    s.end();
    s.removeAllListeners();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled:', err.message);
});
