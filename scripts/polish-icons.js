const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let s = fs.readFileSync(p, 'utf8');

// Fix `{<IC ... />}` → `<IC ... />`
s = s.replace(/\{(<IC\b[^}]*\/>)\}/g, '$1');

// Filter chips: empty icon strings → lucide keys
s = s.replace(/\{ id: 'all', label: 'All Events[^']*', icon: '' \}/g, "{ id: 'all', label: 'All Events', icon: 'calendar' }");
s = s.replace(/\{ id: 'leave', label: 'Leaves[^']*', icon: '' \}/g, "{ id: 'leave', label: 'Leaves', icon: 'palm' }");
s = s.replace(/\{ id: 'hiring', label: 'New Hirings[^']*', icon: '' \}/g, "{ id: 'hiring', label: 'New Hirings', icon: 'rocket' }");
s = s.replace(/\{ id: 'holiday', label: 'Holidays', icon: '' \}/g, "{ id: 'holiday', label: 'Holidays', icon: 'palm' }");
s = s.replace(/\{ id: 'birthday', label: 'Birthdays[^']*', icon: '' \}/g, "{ id: 'birthday', label: 'Birthdays', icon: 'cake' }");
s = s.replace(/\{ id: 'meeting', label: 'Meetings[^']*', icon: '' \}/g, "{ id: 'meeting', label: 'Meetings', icon: 'target' }");

// Seed events icon fields left empty
s = s.replace(/icon: '', badgeColor:/g, "icon: 'calendar', badgeColor:");

// Error boundary: empty warning slot
s = s.replace(
  /<div style=\{\{ fontSize: 48 \}\}><\/div>/,
  '<div style={{ fontSize: 48, color: "var(--amber)" }}><IC n="alertTriangle" s={48} c="var(--amber)" /></div>'
);
s = s.replace(
  />\s*Clear Cache &amp; Reload\s*</,
  '><IC n="refresh" s={16} /> Clear Cache &amp; Reload<'
);

// Render filter chip icons via IC when string key
s = s.replace(
  /\{cat\.icon\}\s*\{cat\.label\}/g,
  '{cat.icon ? <IC n={cat.icon} s={14} /> : null} {cat.label}'
);

fs.writeFileSync(p, s);
console.log('polish OK', s.split(/\n/).length);
