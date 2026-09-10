/**
 * Inspect candidate dates in MongoDB (read-only).
 * Run: node -r dotenv/config scripts/inspect-candidates.js dotenv_config_path=.env.local
 */
const mongoose = require('mongoose');

function normalizeCandidateDate(dateStr) {
  if (dateStr == null || dateStr === '') return '';
  const str = String(dateStr).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return `UNPARSED:${str}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('candidates');

  const total = await col.countDocuments();
  console.log('TOTAL', total);

  const byRawDate = await col
    .aggregate([{ $group: { _id: '$date', n: { $sum: 1 } } }, { $sort: { n: -1 } }])
    .toArray();
  console.log('\nRAW DATE VALUES (top 40):');
  byRawDate.slice(0, 40).forEach((r) => console.log(String(r.n).padStart(4), JSON.stringify(r._id)));

  const all = await col.find({}, { projection: { date: 1, name: 1, employee: 1, createdAt: 1, updatedAt: 1 } }).toArray();
  const byNorm = {};
  const samples = {};
  for (const c of all) {
    const n = normalizeCandidateDate(c.date);
    byNorm[n] = (byNorm[n] || 0) + 1;
    if (!samples[n]) samples[n] = c;
  }
  console.log('\nNORMALIZED DATES:');
  Object.entries(byNorm)
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .forEach(([k, v]) => console.log(String(v).padStart(4), k));

  const days = ['2026-09-08', '2026-09-09', '2026-09-10'];
  for (const d of days) {
    const rows = all.filter((c) => normalizeCandidateDate(c.date) === d);
    console.log(`\n=== ${d} count=${rows.length} ===`);
    rows.slice(0, 15).forEach((c) => {
      console.log(
        '-',
        c.name,
        '| emp:',
        c.employee,
        '| date:',
        JSON.stringify(c.date),
        '| created:',
        c.createdAt
      );
    });
  }

  const start = new Date('2026-09-08T00:00:00.000Z');
  const end = new Date('2026-09-11T00:00:00.000Z');
  const recent = all.filter((c) => c.createdAt && c.createdAt >= start && c.createdAt < end);
  console.log(`\ncreatedAt between 2026-09-08 and 2026-09-11: ${recent.length}`);
  const byDayCreated = {};
  recent.forEach((c) => {
    const key = c.createdAt.toISOString().slice(0, 10);
    byDayCreated[key] = (byDayCreated[key] || 0) + 1;
  });
  console.log('createdAt UTC days', byDayCreated);
  recent.slice(0, 20).forEach((c) => {
    console.log(
      '-',
      c.createdAt.toISOString(),
      '| date field:',
      JSON.stringify(c.date),
      '|',
      c.name,
      '|',
      c.employee
    );
  });

  const latest = [...all]
    .filter((c) => c.createdAt)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);
  console.log('\nLATEST 12 created:');
  latest.forEach((c) => {
    console.log(c.createdAt.toISOString(), JSON.stringify(c.date), c.name, c.employee);
  });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
