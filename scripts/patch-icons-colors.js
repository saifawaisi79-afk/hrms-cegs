const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let s = fs.readFileSync(p, 'utf8');

function replaceTitleIcon(titlePrefix, iconKey) {
  const re = new RegExp(`(title=["']${titlePrefix}[^"']*["'][^\\n]{0,80}?icon=)["'][^"']*["']`, 'g');
  s = s.replace(re, `$1"${iconKey}"`);
}

replaceTitleIcon('Calls Made', 'phone');
replaceTitleIcon('Interviews', 'calendar');
replaceTitleIcon('Walk-ins', 'walk');
replaceTitleIcon('Selected', 'trophy');
replaceTitleIcon('Joined', 'users');

s = s.replace(/if \(newEventForm\.type === 'leave'\) \{ icon = '';/g, "if (newEventForm.type === 'leave') { icon = 'calendar';");
s = s.replace(/else if \(newEventForm\.type === 'hiring'\) \{ icon = '';/g, "else if (newEventForm.type === 'hiring') { icon = 'rocket';");
s = s.replace(/else if \(newEventForm\.type === 'holiday'\) \{ icon = '';/g, "else if (newEventForm.type === 'holiday') { icon = 'palm';");
s = s.replace(/else if \(newEventForm\.type === 'birthday'\) \{ icon = '';/g, "else if (newEventForm.type === 'birthday') { icon = 'cake';");

s = s.replace(
  'export function RecruitmentPage({ db, save, user, setView, setQuickViewUser, setChatTargetUser, openChatWithUser }) {',
  "export function RecruitmentPage({ db, save, user, setView, setQuickViewUser, setChatTargetUser, openChatWithUser, initialSheet = 'calls', variant = 'full' }) {"
);

s = s.replace(
  "const [activeTaskCategory, setActiveTaskCategory] = useState('calls');",
  "const [activeTaskCategory, setActiveTaskCategory] = useState(initialSheet || 'calls');\n useEffect(() => { if (initialSheet) setActiveTaskCategory(initialSheet); }, [initialSheet]);"
);

s = s.replace(
  "localStorage.removeItem('cegs_user');\n      window.location.reload();",
  "localStorage.removeItem('cegs_user');\n      window.location.href = '/login';"
);

s = s.replace(/emoji: ''/g, "iconKey: 'award'");
s = s.replace(/emoji: newBadgeEmoji/g, "iconKey: 'award'");
s = s.replace(/\{ub\.badge\.emoji\}/g, '{<IC n={ub.badge.iconKey || "award"} s={28} />}');
s = s.replace(/\{b\.emoji\}/g, '{<IC n={b.iconKey || "award"} s={20} />}');
s = s.replace(/\{badge\?\.emoji\} /g, '');
s = s.replace(/\{badge\?\.emoji\}/g, '');

// Event icon render
s = s.replace(/\{evt\.icon \|\| ''\}/g, '{typeof evt.icon === "string" && evt.icon ? <IC n={evt.icon} s={16} /> : null}');

// Hardcoded purple / indigo brand colors → tokens
s = s.replace(/#7C5CFC/gi, 'var(--accent)');
s = s.replace(/#6D28D9/gi, 'var(--accent-hover)');
s = s.replace(/#6366F1/gi, 'var(--accent-2)');
s = s.replace(/#8B5CF6/gi, 'var(--accent)');
s = s.replace(/#312E81/gi, 'var(--void)');
s = s.replace(/#1E1B4B/gi, 'var(--void)');
s = s.replace(/#F5F3FF/gi, 'var(--accent-soft)');
s = s.replace(/#E0E7FF/gi, 'var(--accent-soft)');
s = s.replace(/#3730A3/gi, 'var(--accent-hover)');

// Error boundary button
s = s.replace(
  "background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer' }",
  "background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }"
);

fs.writeFileSync(p, s);
console.log('OK lines', s.split(/\n/).length);
