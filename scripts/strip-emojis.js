/**
 * Strip decorative emoji from HrmsLegacy and map icon fields to Lucide keys.
 * Run: node scripts/strip-emojis.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let src = fs.readFileSync(file, 'utf8');

// Map emoji → Lucide IC key (for icon: '…' style fields)
const iconFieldMap = {
  '🏖️': 'palm',
  '🌴': 'palm',
  '🎂': 'cake',
  '🚀': 'rocket',
  '🎯': 'target',
  '📅': 'calendar',
  '📞': 'phone',
  '🚶': 'walk',
  '🏆': 'trophy',
  '👥': 'users',
  '👤': 'user',
  '📋': 'clipboard',
  '📁': 'folder',
  '📄': 'file',
  '💬': 'chat',
  '🔒': 'lock',
  '🔍': 'search',
  '☕': 'coffee',
  '🍱': 'utensils',
  '🏅': 'award',
  '✨': 'sparkles',
  '💼': 'briefcase',
  '⚡': 'zap',
  '⚙️': 'settings',
  '⚙': 'settings',
  '🔧': 'wrench',
  '🔄': 'refresh',
  '❌': 'x',
  '🟢': 'checkCircle',
  '✅': 'checkCircle',
  '✔': 'check',
  '✓': 'check',
  '🎉': 'party',
  '📊': 'chart',
  '📌': 'pin',
  '💻': 'laptop',
  '📤': 'upload',
  '🗑️': 'trash',
  '🗑': 'trash',
  '👁️': 'eye',
  '👁': 'eye',
  '➕': 'plus',
  '⚠️': 'alertTriangle',
  '⚠': 'alertTriangle',
  '🛡️': 'shield',
  '🛡': 'shield',
  '🏢': 'building',
  '✏️': 'edit',
  '✏': 'edit',
  '⏸️': 'pause',
  '⏸': 'pause',
  '▶️': 'play',
  '▶': 'play',
  '⬇️': 'download',
  '⬇': 'download',
  '⏳': 'clock',
};

// Replace icon: 'emoji' with icon: 'lucideKey'
for (const [emoji, key] of Object.entries(iconFieldMap)) {
  const escaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  src = src.replace(new RegExp(`icon:\\s*'${escaped}'`, 'g'), `icon: '${key}'`);
  src = src.replace(new RegExp(`icon:\\s*"${escaped}"`, 'g'), `icon: "${key}"`);
}

// Strip emoji from string content (titles, labels, alerts) — keep words
const emojiRegex = /(?:\uFE0F|\u200D|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}])/gu;

function stripEmojiFromStrings(input) {
  // Process single and double quoted strings carefully via replace on common patterns
  return input.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, (full, q, inner) => {
    // Skip if this looks like an icon key assignment we already fixed
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(inner)) return full;
    let cleaned = inner.replace(emojiRegex, '');
    // Collapse leftover spaces / punctuation spacing
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').replace(/^\s+|\s+$/g, (m) => (m.includes('\n') ? m : ''));
    cleaned = cleaned.replace(/^[\s]+/, '').replace(/[\s]+$/, '');
    // Fix "word  word" after strip
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    if (cleaned !== inner) return q + cleaned + q;
    return full;
  });
}

src = stripEmojiFromStrings(src);

// JSX text nodes with lone emoji (e.g. >🛡️</div>) — replace common blocks
const jsxEmojiBlocks = [
  [/>\s*🛡️\s*</g, '><IC n="shield" s={22} /><'],
  [/>\s*🛡\s*</g, '><IC n="shield" s={22} /><'],
  [/>\s*⚠️\s*</g, '><IC n="alertTriangle" s={40} /><'],
  [/>\s*⚠\s*</g, '><IC n="alertTriangle" s={40} /><'],
  [/>\s*📄\s*</g, '><IC n="file" s={40} /><'],
  [/>\s*🗑️\s*</g, '><IC n="trash" s={16} /><'],
  [/>\s*🗑\s*</g, '><IC n="trash" s={16} /><'],
];
for (const [re, rep] of jsxEmojiBlocks) {
  src = src.replace(re, rep);
}

// Remaining emoji in JSX (outside strings) — strip
src = src.replace(emojiRegex, '');

// Cleanup doubled spaces in JSX text
src = src.replace(/>\s{2,}/g, '> ');
src = src.replace(/\s{2,}</g, ' <');

fs.writeFileSync(file, src);
console.log('Emoji strip complete');
