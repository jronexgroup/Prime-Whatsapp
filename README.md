# 🇧🇩 Prime WhatsApp — AI Memory Assistant

> **Your WhatsApp, But With a Brain.**

Prime WhatsApp is not just an auto-reply bot. It's a **memory-aware, personality-driven AI assistant** that lives inside your WhatsApp. It remembers who you are, how you talk, what you like — and replies like a real human.

---

## ✨ What Makes It Different

| Feature | Prime WhatsApp | Other Bots |
|---|---|---|
| 🧠 Long-term memory | ✅ Remembers everything | ❌ Forgets after reply |
| 🎭 Personality adaptation | ✅ Friend / Client / Family mode | ❌ One tone fits none |
| 🌐 Language match | ✅ Speaks your language | ❌ English-only |
| ⚡ Response speed | ✅ < 2s average | ❌ Slow & robotic |
| 🔌 Self-hosted | ✅ Your data, your control | ❌ Third-party dependency |
| ♾️ No monthly fees | ✅ Free to run | ❌ $20–50/mo |

---

## 🧠 How It Works

```
WhatsApp User ←→ Baileys WebSocket
                     ↓
              Message Processor
              ↙              ↘
     Firebase Memory     Cloudflare Workers AI
     (Profile | Context) (Qwen3 30B)
              ↘              ↙
              Human-like Reply
                     ↓
                 WhatsApp
                     
                Web Dashboard
         (Express + EJS — port $PORT)
         QR | Chat | Users | Personality
         Broadcast | Tasks | Schedule | Memory
```

**Memory never dies.** Even if you chat after a week, Prime remembers the context.

---

## 📦 What You Get

- 🔌 **Real-time messaging** — Receive & send via WhatsApp WebSocket
- 🧠 **Firebase Firestore memory** — Stores profiles, messages, and summaries
- 🤖 **Cloudflare Workers AI (Qwen3 30B)** — Contextual, human-like replies
- 🎭 **Dynamic personality** — Adapts tone per user (friend, client, family, group)
- 🌍 **Multi-language** — Banglish, Hinglish, English, Bengali, Hindi — matches your language
- 👥 **Group support** — Mention-only mode, no spam
- ⚙️ **Commands** — `.help` `.ping` `.resetmemory` `.summary` `.owner`
- 🔐 **Secure** — env-based secrets, session encryption, anti-spam queue
- 🔁 **Auto-reconnect** — Stays online even after disconnects
- 📊 **Web Dashboard** — Manage everything from your browser (QR, messages, users, personality, broadcasts, tasks)

---

## 📁 Project Structure

```
prime-whatsapp/
├── src/
│   ├── index.js            # Entry point
│   ├── server.js           # Express server (status page + dashboard mount)
│   ├── config/index.js     # Environment config
│   ├── socket/index.js     # Baileys WhatsApp connection
│   ├── firebase/index.js   # Firestore database operations (users, broadcasts, tasks, config)
│   ├── ai/index.js         # Cloudflare Workers AI integration (Qwen3 30B)
│   ├── memory/index.js     # Language detection & prompt builder
│   ├── commands/index.js   # Bot commands (.help, .ping, etc.)
│   ├── handlers/index.js   # Message processor & auto-summary
│   ├── utils/queue.js      # Rate-limiting & anti-ban queue
│   └── dashboard/
│       ├── server.js       # Dashboard route handlers (auth, views, API)
│       ├── views/          # EJS templates (12 pages)
│       │   ├── layout.ejs  login.ejs  index.ejs  qr.ejs
│       │   ├── chat.ejs  broadcast.ejs  schedule.ejs
│       │   ├── personality.ejs  profile.ejs  users.ejs
│       │   ├── memory.ejs  tasks.ejs
│       └── public/         # Static assets
│           ├── style.css
│           └── script.js
├── sessions/               # WhatsApp auth (don't share!)
├── logs/
├── .env                    # Your secrets here
└── package.json
```

---

## 🚀 Step-by-Step Setup Guide

### ⚡ Prerequisites

| Requirement | Why |
|---|---|
| **Node.js v18+** | Runtime for the bot |
| **A Firebase project** | Free tier — stores memory |
| **A Cloudflare account** | Free Workers AI plan (Qwen3 30B) |
| **A WhatsApp number** | Secondary number recommended |
| **A terminal** | Your command center |

---

### 🧩 Step 1: Get Your API Keys

#### 1.1 — Cloudflare Workers AI Token

1. Go to [Cloudflare Dashboard → Workers & Pages → Workers AI](https://cloudflare.com)
2. Create an API token with Workers AI permissions
3. Copy the token — you'll need this as `CF_API_TOKEN`

#### 1.2 — Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Create a project** (or use existing)
3. Go to **Project Settings → Service Accounts**
4. Click **"Generate New Private Key"**
5. A JSON file downloads containing:
   - `project_id`
   - `client_email`
   - `private_key`

---

### 🛠️ Step 2: Server Setup (Pick One)

<details>
<summary><b>☁️ Option A: Deploy on Render (Easiest Cloud)</b></summary>

1. Create account at [render.com](https://render.com)
2. Click **New + → Web Service**
3. Connect your GitHub repo
4. Fill:
   - **Name:** `prime-whatsapp`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variable in Render dashboard:
   - `GEMINI_API_KEY` = your key
   - `OWNER_NUMBER` = your number
6. **Health Check Path:** `/`
7. Click **Deploy**
8. Once deployed → Open `https://your-app.onrender.com/qr` in your browser → Scan QR with WhatsApp

> ✅ Bot includes a built-in HTTP server on `$PORT`. No port warnings.
> Stop anytime from Render Dashboard.
</details>

<details>
<summary><b>☁️ Option B: Deploy on Railway (Easiest 24/7)</b></summary>

1. Create account at [railway.app](https://railway.app)
2. Click **New Project → Deploy from GitHub**
3. Add environment variables from `.env`
4. Deploy → View QR in logs → Scan
5. Railway stays awake 24/7 on free tier (limited hours)
</details>

<details>
<summary><b>💻 Option C: Local / VPS (Ubuntu / Termux)</b></summary>

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 2. Clone & install
git clone https://github.com/YOUR_USER/prime-whatsapp.git
cd prime-whatsapp
npm install

# 3. Configure
nano .env    # paste your keys, save & exit

# 4. Run
npm start
```

For **Termux**:
```bash
pkg update && pkg upgrade
pkg install nodejs git
git clone https://github.com/YOUR_USER/prime-whatsapp.git
cd prime-whatsapp
npm install
nano .env
npm start
```
</details>

---

### 🔐 Step 3: Configure `.env`

Create `.env` in the project root:

```env
CF_API_TOKEN=cfut_...
CF_ACCOUNT_ID=be629d05...
CF_MODEL=@cf/qwen/qwen3-30b-a3b-fp8
BOT_NAME=Prime
BOT_PREFIX=.
OWNER_NUMBER=919876543210
DASHBOARD_PASSWORD=your_secure_password
```

> **Dashboard:** Set `DASHBOARD_PASSWORD` to enable password protection. Omit it and the dashboard is open (dev mode).

---

### 📱 Step 4: Scan QR & Go Live

```bash
npm start
```

You'll see:
```
Starting Prime WhatsApp...
Firebase connected
Gemini AI initialized
Scan the QR code above with your WhatsApp
```

1. Open WhatsApp on your phone
2. **Settings → Linked Devices → Link a Device**
3. Scan the QR code in the terminal
4. **Done!** Your AI assistant is live. 🎉

---

### 🧪 Step 5: Test It

Send a message to your bot number:

| Command | What it does |
|---|---|
| `hello` | AI generates a reply based on memory |
| `.help` | Shows all commands |
| `.ping` | Check if alive |
| `.resetmemory` | Wipes your memory |
| `.summary` | Shows what Prime remembers about you |
| `.owner` | Shows owner contact |

---

## 📊 Web Dashboard

Access the management panel at `http://localhost:3000/dashboard` (or your deployed URL).

### 🔐 Authentication

Set `DASHBOARD_PASSWORD` in your `.env` to enable password protection:
```env
DASHBOARD_PASSWORD=your_secure_password
```
Without it, the dashboard is open-access (use only in dev/trusted networks). Login page at `/dashboard/login`.

### 📄 Pages

| Page | Route | What You Can Do |
|------|-------|----------------|
| **Dashboard** | `/dashboard` | Bot status, messages today, active users, total users, uptime, quick action links |
| **QR / Pairing** | `/dashboard/qr` | View QR code for WhatsApp pairing, check connection status |
| **Send Message** | `/dashboard/chat` | Type a message and send it to any WhatsApp number or group (auto-saves to memory) |
| **Broadcast** | `/dashboard/broadcast` | Create bulk message campaigns, select recipients from user list or paste JIDs, schedule for later |
| **Schedule** | `/dashboard/schedule` | View all scheduled broadcasts, send pending ones, delete |
| **Personality** | `/dashboard/personality` | Edit bot name, default language, tone, relationship, and full system prompt — saved to Firebase `config/bot` |
| **My Profile** | `/dashboard/profile` | Edit individual user profiles — set their name, language preference, tone, and relationship style |
| **Users** | `/dashboard/users` | List all users who messaged the bot, view their JID and language, reset their memory |
| **Memory** | `/dashboard/memory` | Select a user to view their stored memory context and full message history |
| **Tasks** | `/dashboard/tasks` | Create automated tasks: scheduled messages, auto-reply templates, reminders |

### 🔌 API Endpoints (JSON)

These power the dashboard and are available for external integrations:

```
GET  /api/state                      → Bot connection status, uptime, stats
GET  /api/users                      → List all users from Firestore
GET  /api/users/:jid                 → User profile + memory
GET  /api/users/:jid/messages        → Recent messages for a user
POST /api/users/:jid/reset           → Clear user memory
POST /api/broadcasts                 → Create a broadcast campaign
GET  /api/broadcasts                 → List all broadcasts
PUT  /api/broadcasts/:id             → Update broadcast
DEL  /api/broadcasts/:id             → Delete broadcast
POST /api/broadcasts/:id/send        → Send broadcast immediately
POST /api/tasks                      → Create an automation task
GET  /api/tasks                      → List all tasks
PUT  /api/tasks/:id                  → Update task (enable/disable)
DEL  /api/tasks/:id                  → Delete task
GET  /api/config                     → Get bot personality config
PUT  /api/config                     → Update bot personality config
```

All API routes return JSON and are subject to the same password auth if `DASHBOARD_PASSWORD` is set.

---

## 🧠 Memory System Explained

Prime WhatsApp stores **three layers of memory** for each user:

```
Profile          → Name, language, tone, relationship
Recent messages  → Last 20 messages for context
Long-term summary → Auto-generated personality summary
```

When you chat:

1. Prime fetches your **profile**
2. Loads your **last 20 messages**
3. Reads your **long-term summary**
4. Injects everything into the **Gemini prompt**
5. AI replies with full context
6. Reply and summary are **saved to Firebase**

Over time, Prime builds a deeper understanding of who you are and how you talk.

---

## 🛡️ Anti-Ban Protection

- ✅ Queue-based message sending (no bursts)
- ✅ Random human-like delays (500ms–2s)
- ✅ Typing simulation before replies
- ✅ Group mention-only mode (no unsolicited replies)
- ✅ No bulk messaging
- ✅ Dedicated WhatsApp number recommended

---

## 📊 Performance

| Metric | Target | Status |
|---|---|---|
| Response time | < 2s | ✅ |
| Memory retrieval | < 500ms | ✅ |
| Reconnect recovery | < 10s | ✅ |
| AI generation | < 2.5s | ✅ (Qwen3 30B A3B) |

---

## 🚧 Limitations

- ⚠️ Uses unofficial WhatsApp API (Baileys) — ban risk exists
- ⚠️ Requires QR pairing every session (persistent auth supported)
- ⚠️ WhatsApp protocol changes may temporarily break the bot

---

## 🔮 Roadmap

### V2 (Coming)
- 🎤 Voice message transcription (Bangla + English)
- 👁️ OCR image understanding
- 🎨 AI stickers
- 🤖 Smart auto-replies based on keywords

### V3 (Building)
- 🧠 Multi-agent system
- 📊 Dashboard panel ✅ *(Done — Express + EJS, 10 pages, API)*
- 👥 Team inbox
- 🔌 Plugin ecosystem
- 🏠 Local LLM support (Ollama, Llama)

---

## 🧑‍💻 For Developers

```bash
# Development mode (auto-restart on changes)
npm run dev

# Project structure
src/
├── config/     # Environment & bot configuration
├── socket/     # WhatsApp connection management
├── firebase/   # Database layer
├── ai/         # AI engine
├── memory/     # Context & prompt building
├── commands/   # Built-in commands
├── handlers/   # Message processing
└── utils/      # Queue, helpers
```

---

## ❤️ Community

- ⭐ Star this repo if you find it useful
- 🐛 Report issues on GitHub
- 💡 Suggest features via issues
- 🔄 Fork and contribute PRs

---

## 📜 License

MIT — Free to use, modify, and distribute.

---

**Prime WhatsApp** — *Not a bot. A personality.* 🇧🇩
