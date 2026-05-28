import { Router } from 'express';
import { createHash } from 'crypto';
import { getState, getQR, getStats, incrementMessages } from '../server.js';
import { getSocket } from '../socket/index.js';
import {
  getUserProfile, getUserMemory, getRecentMessages, saveMessage,
  updateProfile, updateMemorySummary, listUsers,
  listBroadcasts, createBroadcast, updateBroadcast, deleteBroadcast,
  listTasks, createTask, updateTask, deleteTask,
  getBotConfig, updateBotConfig,
} from '../firebase/index.js';

export const dashboardRouter = Router();

const PASSWORD = process.env.DASHBOARD_PASSWORD;
if (!PASSWORD) console.warn('⚠️  DASHBOARD_PASSWORD not set — auth disabled');

function hashPass(pw) {
  return createHash('sha256').update(pw).digest('hex');
}

function authCheck(req, res, next) {
  if (!PASSWORD) return next();
  if (req.cookies?.token === hashPass(PASSWORD)) return next();
  if (req.path === '/dashboard/login') return next();
  if (req.path.startsWith('/api/')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.redirect('/dashboard/login');
}

dashboardRouter.use(authCheck);

// ── Login ──

dashboardRouter.get('/dashboard/login', (req, res) => {
  if (PASSWORD && req.cookies?.token === hashPass(PASSWORD)) {
    res.redirect('/dashboard');
    return;
  }
  res.render('login', { error: null });
});

dashboardRouter.post('/dashboard/login', (req, res) => {
  if (req.body.password === PASSWORD) {
    res.cookie('token', hashPass(PASSWORD), { httpOnly: true, maxAge: 86400000 * 30 });
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Wrong password' });
  }
});

dashboardRouter.get('/dashboard/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/dashboard/login');
});

// ── Dashboard Home ──

dashboardRouter.get('/dashboard', async (req, res) => {
  const stats = getStats();
  let users = [];
  try { users = await listUsers() || []; } catch {}
  res.render('index', {
    state: getState(),
    stats,
    userCount: users.length,
  });
});

// ── QR ──

dashboardRouter.get('/dashboard/qr', (req, res) => {
  res.render('qr', { qr: getQR(), state: getState() });
});

// ── Chat (Send Message) ──

dashboardRouter.get('/dashboard/chat', async (req, res) => {
  let users = [];
  try { users = await listUsers() || []; } catch {}
  res.render('chat', { users });
});

dashboardRouter.post('/dashboard/chat/send', async (req, res) => {
  try {
    const { jid, message } = req.body;
    if (!jid || !message) {
      res.status(400).json({ error: 'jid and message required' });
      return;
    }
    const sock = getSocket();
    if (!sock) {
      res.status(503).json({ error: 'WhatsApp not connected' });
      return;
    }
    await sock.sendMessage(jid, { text: message });
    incrementMessages();
    try {
      const sender = process.env.BOT_JID || sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
      await saveMessage(jid, 'assistant', message);
    } catch {}
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Broadcasts ──

dashboardRouter.get('/dashboard/broadcast', async (req, res) => {
  let broadcasts = [];
  try { broadcasts = await listBroadcasts() || []; } catch {}
  let users = [];
  try { users = await listUsers() || []; } catch {}
  res.render('broadcast', { broadcasts, users });
});

dashboardRouter.post('/api/broadcasts', async (req, res) => {
  try {
    const b = await createBroadcast(req.body);
    res.json(b || { error: 'Failed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.put('/api/broadcasts/:id', async (req, res) => {
  try {
    const ok = await updateBroadcast(req.params.id, req.body);
    res.json({ ok });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.delete('/api/broadcasts/:id', async (req, res) => {
  try {
    const ok = await deleteBroadcast(req.params.id);
    res.json({ ok });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.post('/api/broadcasts/:id/send', async (req, res) => {
  try {
    const b = (await listBroadcasts()).find(x => x.id === req.params.id);
    if (!b) { res.status(404).json({ error: 'Not found' }); return; }
    const sock = getSocket();
    if (!sock) { res.status(503).json({ error: 'WhatsApp not connected' }); return; }
    const recipients = b.recipients || [];
    let sent = 0;
    for (const jid of recipients) {
      try {
        await sock.sendMessage(jid, { text: b.message });
        sent++;
      } catch {}
    }
    await updateBroadcast(req.params.id, { status: 'sent', sentAt: Date.now().toString() });
    res.json({ ok: true, sent, total: recipients.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Schedule ──

dashboardRouter.get('/dashboard/schedule', async (req, res) => {
  let broadcasts = [];
  try { broadcasts = (await listBroadcasts() || []).filter(b => b.scheduledAt); } catch {}
  res.render('schedule', { broadcasts });
});

// ── Personality ──

dashboardRouter.get('/dashboard/personality', async (req, res) => {
  let config = {};
  try { config = await getBotConfig() || {}; } catch {}
  res.render('personality', { config });
});

dashboardRouter.post('/dashboard/personality', async (req, res) => {
  try {
    const { name, language, tone, relationship, systemPrompt } = req.body;
    await updateBotConfig({ name, language, tone, relationship, systemPrompt });
    res.redirect('/dashboard/personality');
  } catch (err) {
    res.render('personality', { config: req.body, error: err.message });
  }
});

// ── Profile ──

dashboardRouter.get('/dashboard/profile', async (req, res) => {
  let users = [];
  try { users = await listUsers() || []; } catch {}
  res.render('profile', { users });
});

dashboardRouter.post('/dashboard/profile', async (req, res) => {
  try {
    const { jid, name, language, tone, relationship } = req.body;
    if (!jid) { res.status(400).json({ error: 'jid required' }); return; }
    await updateProfile(jid, { name, language, tone, relationship });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Users ──

dashboardRouter.get('/dashboard/users', async (req, res) => {
  let users = [];
  try { users = await listUsers() || []; } catch {}
  res.render('users', { users });
});

dashboardRouter.get('/api/users', async (req, res) => {
  try {
    const users = await listUsers() || [];
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.get('/api/users/:jid', async (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const profile = await getUserProfile(jid);
    const memory = await getUserMemory(jid);
    res.json({ jid, profile, memory });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.get('/api/users/:jid/messages', async (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const msgs = await getRecentMessages(jid, parseInt(req.query.limit) || 50);
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.post('/api/users/:jid/reset', async (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    await updateMemorySummary(jid, '');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Memory Viewer ──

dashboardRouter.get('/dashboard/memory', async (req, res) => {
  let users = [], memory = null, jid = null, messages = [];
  try { users = await listUsers() || []; } catch {}
  if (req.query.jid) {
    jid = req.query.jid;
    try {
      const m = await getUserMemory(jid);
      memory = m?.context || m?.summary || '';
      messages = await getRecentMessages(jid, 50);
    } catch {}
  }
  res.render('memory', { users, jid, memory, messages });
});

// ── Tasks ──

dashboardRouter.get('/dashboard/tasks', async (req, res) => {
  let tasks = [];
  try { tasks = await listTasks() || []; } catch {}
  res.render('tasks', { tasks });
});

dashboardRouter.post('/api/tasks', async (req, res) => {
  try {
    const t = await createTask({ ...req.body, enabled: true, createdAt: Date.now().toString() });
    res.json(t || { error: 'Failed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.put('/api/tasks/:id', async (req, res) => {
  try {
    const ok = await updateTask(req.params.id, req.body);
    res.json({ ok });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.delete('/api/tasks/:id', async (req, res) => {
  try {
    const ok = await deleteTask(req.params.id);
    res.json({ ok });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: State ──

dashboardRouter.get('/api/state', (req, res) => {
  res.json({
    state: getState(),
    hasQr: !!getQR(),
    stats: getStats(),
  });
});

// ── API: Config ──

dashboardRouter.get('/api/config', async (req, res) => {
  try {
    const cfg = await getBotConfig();
    res.json(cfg || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.put('/api/config', async (req, res) => {
  try {
    await updateBotConfig(req.body);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
