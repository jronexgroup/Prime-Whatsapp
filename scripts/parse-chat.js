import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('DOC-20260524-WA0002/WhatsApp Chat with Sadia.txt', 'utf8');
const lines = content.split('\n');

const messages = [];
let currentLine = null;

for (const line of lines) {
  const match = line.match(/^(\d{2}\/\d{2}\/\d{2}, \d{1,2}:\d{2} [ap]m) - ([^:]+): (.+)$/);
  if (match) {
    if (currentLine) messages.push(currentLine);
    const [, timestamp, sender, text] = match;
    currentLine = {
      timestamp: parseTimestamp(timestamp),
      sender: sender.trim(),
      text: text.trim(),
    };
  } else if (currentLine && line.trim()) {
    currentLine.text += '\n' + line.trim();
  }
}
if (currentLine) messages.push(currentLine);

function parseTimestamp(str) {
  const [datePart, timePart] = str.split(', ');
  const [day, month, year] = datePart.split('/');
  const normalizedTime = timePart.replace(' ', ' ');
  const isPM = normalizedTime.includes('pm');
  let [hours, minutes] = normalizedTime.replace(/(am|pm)/, '').trim().split(':');
  hours = parseInt(hours);
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  const date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day), hours, parseInt(minutes));
  return date.getTime();
}

const filtered = messages.filter(m => {
  const t = m.text;
  return t !== '<Media omitted>' && t !== '.' && t !== '..' && t !== '...' && t !== '....' && t !== '.....' && t !== 'You deleted this message' && t !== 'This message was deleted' && !t.startsWith('<Media omitted>') && !/^H+m+$/.test(t) && !/^O+$/.test(t);
});

const sadiaMessages = filtered.map(m => ({
  role: m.sender.toLowerCase() === 'sadia' ? 'user' : 'assistant',
  text: m.text,
  timestamp: m.timestamp,
}));

const summary = generateSummary(filtered);
const profile = {
  name: 'Sadia',
  language: 'bn',
  tone: 'casual',
  relationship: 'cousin',
};

writeFileSync('scripts/sadia_seed.json', JSON.stringify({ profile, memory: { summary }, messages: sadiaMessages }, null, 2));
console.log(`Parsed ${messages.length} total messages, ${sadiaMessages.length} text messages`);
console.log('Profile:', JSON.stringify(profile));
console.log('Summary:', summary);
console.log('Saved to scripts/sadia_seed.json');

function generateSummary(msgs) {
  const topics = [];
  if (msgs.some(m => m.text.toLowerCase().includes('break'))) topics.push('Breakup in November');
  if (msgs.some(m => m.text.includes('উকিল') || m.text.includes('lawyer') || m.text.includes('case'))) topics.push('Wants to become a lawyer');
  if (msgs.some(m => m.text.includes('project'))) topics.push('School projects');
  if (msgs.some(m => m.text.includes('computer'))) topics.push('Learning computer');
  if (msgs.some(m => m.text.includes('school') || m.text.includes('স্কুল'))) topics.push('School student (SSC complete, moving to college)');
  if (msgs.some(m => m.text.includes('tuition') || m.text.includes('টিউশন'))) topics.push('Takes private tuition');
  if (msgs.some(m => m.text.includes('app') || m.text.includes('Cousin Pro'))) topics.push('Helping with Cousin Pro app development');
  if (msgs.some(m => m.text.includes('Islampur') || m.text.includes('Goas'))) topics.push('Lives in Islampur/Goas area');
  if (msgs.some(m => m.text.includes('বিয়ে') || m.text.includes('biye') || m.text.includes('বিয়ের'))) topics.push('Family pressuring for marriage but wants to study');
  if (msgs.some(m => m.text.includes('reel') || m.text.includes('video'))) topics.push('Enjoys reels and videos');
  return topics.join('. ') + '. Casual and humorous conversation style, mixes Bengali and English.';
}
