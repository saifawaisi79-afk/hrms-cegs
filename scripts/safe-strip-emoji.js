const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let s = fs.readFileSync(p, 'utf8');
const before = s.length;
const beforeLines = s.split(/\n/).length;

// Remove emoji / dingbat codepoints only — do not parse strings
const emoji =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}]/gu;
s = s.replace(emoji, '');

// Collapse accidental double spaces (not newlines)
s = s.replace(/ {2,}/g, ' ');
// Empty quote leftovers like ' ' -> ''
s = s.replace(/' '/g, "''");
s = s.replace(/" "/g, '""');

const afterLines = s.split(/\n/).length;
if (afterLines < beforeLines * 0.9) {
  console.error('ABORT: line count dropped suspiciously', beforeLines, '->', afterLines);
  process.exit(1);
}

fs.writeFileSync(p, s);
console.log('OK bytes', before, '->', s.length, 'lines', beforeLines, '->', afterLines);
