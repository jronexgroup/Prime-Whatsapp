import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';

let state = 'starting';
let qrData = null;

export function setState(s) { state = s; }
export function setQR(qr) { qrData = qr; }

export function startServer() {
  const port = process.env.PORT || 3000;

  const server = createServer((req, res) => {
    if (req.url === '/qr' && qrData) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="text-align:center;padding:40px;font-family:sans-serif">
        <h2>Scan this QR with WhatsApp</h2>
        <p>Open WhatsApp → Linked Devices → Link a Device</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}" />
        <p style="color:#888;font-size:12px">Prime WhatsApp — ${state}</p>
      </body></html>`);
      return;
    }

    const qrImg = existsSync('qr.png');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body style="text-align:center;padding:40px;font-family:sans-serif">
      <h2>🤖 Prime WhatsApp</h2>
      <p>Status: <strong>${state}</strong></p>
      ${qrData ? '<a href="/qr">📱 Scan QR Code</a>' : '<p>Waiting for connection...</p>'}
      ${qrImg ? '<br/><img src="/qr.png" width="300"/>' : ''}
    </body></html>`);
  });

  server.listen(port, () => {
    console.log(`🌐 Status page: http://localhost:${port}`);
  });
}
