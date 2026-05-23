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
WhatsApp User
     ↓
Baileys WebSocket (Real-time)
     ↓
Message Processor
     ↓
Firebase Memory → (Profile | Last 20 chats | Long-term summary)
     ↓
Gemini AI → Personality-Injected Prompt
     ↓
Human-like Reply
     ↓
WhatsApp
```

**Memory never dies.** Even if you chat after a week, Prime remembers the context.

---

## 📦 What You Get

- 🔌 **Real-time messaging** — Receive & send via WhatsApp WebSocket
- 🧠 **Firebase Firestore memory** — Stores profiles, messages, and summaries
- 🤖 **Gemini AI** — Contextual, human-like replies
- 🎭 **Dynamic personality** — Adapts tone per user (friend, client, family, group)
- 🌍 **Multi-language** — Bangla, English, Hindi, mixed — it matches you
- 👥 **Group support** — Mention-only mode, no spam
- ⚙️ **Commands** — `.help` `.ping` `.resetmemory` `.summary` `.owner`
- 🔐 **Secure** — env-based secrets, session encryption, anti-spam queue
- 🔁 **Auto-reconnect** — Stays online even after disconnects

---

## 📁 Project Structure

```
prime-whatsapp/
├── src/
│   ├── index.js            # Entry point
│   ├── config/index.js     # Environment config
│   ├── socket/index.js     # Baileys WhatsApp connection
│   ├── firebase/index.js   # Firestore database operations
│   ├── ai/index.js         # Gemini AI integration
│   ├── memory/index.js     # Prompt builder with personality injection
│   ├── commands/index.js   # Bot commands (.help, .ping, etc.)
│   ├── handlers/index.js   # Message processor & auto-summary
│   └── utils/queue.js      # Rate-limiting & anti-ban queue
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
| **A Gemini API key** | Free from Google AI Studio |
| **A WhatsApp number** | Secondary number recommended |
| **A terminal** | Your command center |

---

### 🧩 Step 1: Get Your API Keys

#### 1.1 — Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Get API Key"**
3. Create a new key (free tier: 60 requests/min)
4. Copy it — you'll need this

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
5. Add environment variables (from `.env`)
6. Deploy → Check logs for QR code → Scan it

> ⚠️ Render free tier sleeps after inactivity. Use UptimeRobot to ping every 10 min.
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
GEMINI_API_KEY=AIzaSy...
FIREBASE_PROJECT_ID=prime-whatsapp-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@prime-whatsapp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
BOT_NAME=Prime
BOT_PREFIX=.
OWNER_NUMBER=919876543210
```

> ⚠️ Keep the `\n` in the private key — Paste the full key with line breaks replaced by `\n`, or wrap it in double quotes and keep the original line breaks.

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
| AI generation | < 1.5s | ✅ (Gemini 2.0 Flash) |

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

### V3 (Planned)
- 🧠 Multi-agent system
- 📊 Dashboard panel
- 👥 Team inbox
- 🔌 Plugin ecosystem
- 🏠 Local LLM support (Llama, Mistral)

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
