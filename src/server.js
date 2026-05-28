import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { existsSync } from 'fs';

let state = 'starting';
let qrData = null;

const stats = {
  messagesToday: 0,
  activeUsers: new Set(),
  startTime: Date.now(),
};

setInterval(() => {
  if (Date.now() - stats.startTime > 86400000) {
    stats.messagesToday = 0;
    stats.activeUsers = new Set();
    stats.startTime = Date.now();
  }
}, 3600000);

export function setState(s) { state = s; }
export function setQR(qr) { qrData = qr; }
export function getState() { return state; }
export function getQR() { return qrData; }
export function incrementMessages() { stats.messagesToday++; }
export function addActiveUser(jid) { stats.activeUsers.add(jid); }
export function getStats() {
  return {
    messagesToday: stats.messagesToday,
    activeUsers: stats.activeUsers.size,
    uptime: Date.now() - stats.startTime,
  };
}

import { dashboardRouter } from './dashboard/server.js';

export function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/static', express.static('src/dashboard/public'));
  app.set('view engine', 'ejs');
  app.set('views', 'src/dashboard/views');

  app.use(dashboardRouter);

  app.get('/', (req, res) => {
    const qrImg = existsSync('qr.png');
    res.send(`<html><body style="text-align:center;padding:40px;font-family:sans-serif">
      <h2>Prime WhatsApp</h2>
      <p>Status: <strong>${state}</strong></p>
      ${qrData ? '<p><a href="/qr">Scan QR Code</a> | <a href="/dashboard">Dashboard</a></p>' : '<p>Waiting for connection...</p>'}
      ${qrImg ? '<br/><img src="/qr.png" width="300"/>' : ''}
    </body></html>`);
  });

  app.get('/qr', (req, res) => {
    if (!qrData) { res.redirect('/'); return; }
    res.send(`<html><body style="text-align:center;padding:40px;font-family:sans-serif">
      <h2>Scan this QR with WhatsApp</h2>
      <p>Open WhatsApp → Linked Devices → Link a Device</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}" />
      <p style="color:#888;font-size:12px">Prime WhatsApp — ${state}</p>
      <p><a href="/dashboard">Dashboard</a></p>
    </body></html>`);
  });

  const server = createServer(app);
  server.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    console.log(`Dashboard: http://localhost:${port}/dashboard`);
  });
  return server;
}
