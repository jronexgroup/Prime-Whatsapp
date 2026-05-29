# Prompts in Use

These are the prompts currently powering Prime WhatsApp — extracted from source code, not the Firestore collection.

---

## 1. System Prompt

**File:** `src/ai/index.js`  
**Usage:** Sent as `{ role: 'system', content: ... }` to Cloudflare Workers AI before every user message.

```
You are {botName} talking to a friend. Reply in the EXACT same language as the friend.

Friend writes Banglish (Bengali in roman letters):
  "kemon acho?"  ->  "bhalo achi, tumi kemon?"
  "ki korcho?"   ->  "kisu na, just chill korchi"
  "kalke ghurte jabi?"  ->  "haan jabo, kothay jabo?"
  "ei sob ki bolchis?"  ->  "ar kichu na, just fun korchi"

Friend writes English -> reply English. Friend writes Hinglish -> reply Hinglish.

NEVER use Bengali/Hindi Unicode (ো, ই, आ, इ). Only a-z roman letters.
Be natural, 1-3 sentences, never repeat their question, no honorifics like didi/bhai/sir.
```

`{botName}` is replaced with `config.bot.name` (from `.env` `BOT_NAME`, default `"Prime"`).

---

## 2. Prompt Template

**File:** `src/memory/index.js` (`buildPrompt`)  
**Usage:** Builds the final `user` message sent to the AI. The system prompt is prepended by Cloudflare.

```
Detected Language: {language}

Conversation so far:
{context}

{userName}: {message}
{botName}:
```

| Placeholder | Source |
|---|---|
| `{language}` | `detectLanguage(incomingMessage)` return value |
| `{context}` | `memory.context` from Firestore (last ~2500 chars of conversation) |
| `{userName}` | `profile.name` or `pushName` or `"User"` |
| `{message}` | The incoming WhatsApp message text |
| `{botName}` | `config.bot.name` |

---

## 3. Language Detection — Banglish Keywords

**File:** `src/memory/index.js` (`detectLanguage`)  
**Usage:** Words matched against incoming text. Each match adds `+3` to Banglish score.

```
ami, tumi, amake, tomake, amra, tomra, tui, tore, toke,
amader, tomader, amar, tomar, apni, apnar,
kemon, keno, kothay, kothao, kobe, kalke,
ki, ke,
jacchi, jabo, jabi, jabe, jai, jawa, jaben, jete,
korchi, korbo, koro, korcho, koren, korte, kore,
bolchi, bolbo, bol, bole, bollo, bolche, bolchis,
dekhchi, dekhte, dekha, dekhbo, dekhbe,
bujhli, bujhlam, bujhi, bujhe, bujhecho,
aschi, asche, asbo, ashbe, ashche,
thaki, thakbo, thakbe, thakte, thik,
dite, diye, dewa,
dakche, dakbe, dakbo, dakchis,
niye, nibo, nichi, nischa,
pari, pare, parbo, parbe, parchi, parte,
lagbe, lage, laglo, lagche,
janina, jani, jana, janam,
ache, nai, chilo,
hobe, hocche, hoy, hoyto, hoyni,
valo, bhalo, kharap,
mana, mane, manush,
ajke, eibar, abar, tahole,
kichu, shob, sob, kono, kokhon,
shune, shona, shunte,
roilo, roibe, rokom,
theke, dhore, dhor,
nijer, para, parte, partam,
ei, eita, eishob, okhane, tokhane, ekhane,
jatse, jaitese,
mone, mon, bhai, mama,
sathe, sunbo, sunlam,
kaaj, kotha, raat, din, kal,
chai, chara, charbo,
markha, mar,
na, o, ar,
aacha, accha, thikache,
bangla, desh, sona, baba, bon, kaka
```

---

## 4. Language Detection — Hindi Keywords

**File:** `src/memory/index.js` (`detectLanguage`)  
**Usage:** Words matched against incoming text. Each match adds `+3` to Hindi score.

```
main, tum, aap, maine, tumne, aapne,
kaise, kya, kahan, kab, kyun, kaun,
hoon, ho, hai, hain, tha, thi, the, honga,
sakta, sakti, sakte,
achha, theek, nahi,
mera, meri, tera, teri, aapka, tumhara, apna,
karta, karti, karte, karna, kar, karne,
chahiye, chahta, chahti, chahte,
liye, ke, ko, se, mein, pe, par,
aaj, abhi, ab, phir, bhi, hi,
raha, rahi, rahe, rahega,
sir, sahab, mujhe, tujhe, humein,
unka, inka, waise, aisa, kaisa, kya
```

---

## 5. Language Detection — Suffix Rules

**File:** `src/memory/index.js` (`detectLanguage`)  
**Usage:** Suffix matching applied to each word. These are weighted more heavily than keyword matches.

| Suffix | Language | Weight |
|---|---|---|
| `-chi`, `-chhi`, `-chis`, `-che`, `-cho` | Banglish | +4 |
| `-bo`, `-lam`, `-li` | Banglish | +4 |
| `-lo` | Banglish | +2 |
| `-be`, `-le` | Banglish | +2 |
| `-ta`, `-ti`, `-te`, `-tu` | Hindi | +4 |
| `-oon`, `-ein`, `-ain`, `-oge`, `-ega` | Hindi | +4 |

---

## 6. Language Detection — Final Classification

**File:** `src/memory/index.js` (`detectLanguage`)  
**Usage:** Compares Banglish vs Hindi scores to decide language.

```
if (bnScore > hiScore && bnScore >= 2)       -> "Banglish"
if (hiScore > bnScore && hiScore >= 2)       -> "Hinglish"
if (bnScore === hiScore && bnScore >= 4)     -> "Banglish"
if (bnScore === hiScore && hiScore >= 4)     -> "Hinglish"
otherwise                                     -> "English"
```

Unicode checks before scoring:
- Bengali Unicode range `\u0980-\u09FF` → immediately returns `"Bengali"`
- Hindi/Devanagari range `\u0900-\u097F` → immediately returns `"Hindi"`
- Arabic, Russian, Tamil ranges also checked

---

## 7. Command Responses

**File:** `src/commands/index.js`  
**Usage:** Hardcoded text replies for bot commands.

**`.help`**
```
{botName} Commands:
.help — Show this message
.ping — Check if bot is alive
.resetmemory — Reset your memory
.summary — Show your memory summary
.owner — Contact the owner
```

**`.ping`**
```
pong!
```

**`.resetmemory`**
```
Your memory has been reset.
```

**`.summary`**
```
Your Memory Summary:
{memory.summary}
```

**`.owner`**
```
Owner: wa.me/{ownerNumber}
```

---

## 8. Memory Context Update Template

**File:** `src/handlers/index.js` (`handleMessage`)  
**Usage:** When appending to `memory.context` in Firestore after each exchange.

```
User: {userMessage} | {botName}: {botReply}
```

New entries are appended to the existing context with a newline separator. If total exceeds 2500 characters, the oldest portion is trimmed from the beginning.
