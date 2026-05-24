#!/bin/bash
echo "======================================="
echo "  🔧 Prime WhatsApp - Fix Tool"
echo "======================================="
echo ""

# 1. Check Node version
NODE_VER=$(node -v 2>/dev/null)
echo "📦 Node.js: $NODE_VER"
if [[ "$NODE_VER" == *"v24"* ]]; then
  echo "   ⚠️  Node v24 detected — Baileys works but v20 LTS is more stable."
  echo "   🔄 Downgrade: https://nodejs.org/en/download/"
fi
echo ""

# 2. Clear sessions
echo "🧹 Cleaning old sessions..."
rm -rf sessions/
echo "   ✅ sessions/ cleared"
echo ""

# 3. Optional: Clear node_modules for fresh install
if [ "$1" = "--full" ]; then
  echo "🧹 Full cleanup..."
  rm -rf node_modules/ package-lock.json
  echo "   ✅ node_modules cleared"
fi
echo ""

# 4. Install deps
echo "📥 Installing dependencies..."
npm install 2>&1 | tail -1
echo "   ✅ Done"
echo ""

# 5. Pin Baileys version (known stable)
echo "📌 Pinning @whiskeysockets/baileys@6.7.15..."
npm install @whiskeysockets/baileys@6.7.15 --save 2>&1 | tail -1
echo "   ✅ Baileys 6.7.15 installed"
echo ""

# 6. Check .env
if [ ! -f .env ]; then
  echo "⚠️  .env file not found! Creating from example..."
  cat > .env << 'EOF'
GEMINI_API_KEY=your_key_here
BOT_NAME=Prime
BOT_PREFIX=.
OWNER_NUMBER=
# PROXY_URL=socks5://127.0.0.1:1080
EOF
  echo "   ✅ .env created — edit it with your GEMINI_API_KEY"
else
  echo "✅ .env exists"
fi
echo ""

# 7. Network check
echo "🌐 Testing network..."
if ping -c 1 -W 3 web.whatsapp.com >/dev/null 2>&1; then
  echo "   ✅ WhatsApp reachable"
else
  echo "   ⚠️  Cannot reach WhatsApp servers!"
  echo "   🔑 Solutions:"
  echo "      - Use VPN (Cloudflare WARP, ProtonVPN)"
  echo "      - Set PROXY_URL in .env"
  echo "      - Use mobile hotspot instead of WiFi"
fi
echo ""

echo "======================================="
echo "  ✅ Ready! Run: npm start"
echo "======================================="
