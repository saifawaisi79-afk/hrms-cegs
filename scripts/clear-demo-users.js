/**
 * Production prep: remove demo login accounts from MongoDB.
 * Keeps real bootstrap accounts (Super Admin / HR) so onboarding still works.
 *
 * Run: node scripts/clear-demo-users.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const DEMO_EMAILS = [
  'employee@cegs.com',
  'demo@cegs.com',
  'test@cegs.com',
];

const DEMO_EMPLOYEE_IDS = ['EMP-DEMO', 'DEMO-001', 'TEST-001'];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in .env.local');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('users');

  const before = await col.find({}).project({ email: 1, employee_id: 1, name: 1, role: 1 }).toArray();
  console.log(`Users before cleanup (${before.length}):`);
  before.forEach((u) => console.log(`  - ${u.employee_id || '?'} | ${u.email} | ${u.role} | ${u.name}`));

  const result = await col.deleteMany({
    $or: [
      { email: { $in: DEMO_EMAILS } },
      { employee_id: { $in: DEMO_EMPLOYEE_IDS } },
      { email: /demo/i },
      { name: /^Demo\b/i },
    ],
  });

  console.log(`\nRemoved ${result.deletedCount} demo user(s).\n`);

  const after = await col.find({}).project({ email: 1, employee_id: 1, name: 1, role: 1 }).toArray();
  console.log(`Remaining accounts (${after.length}) — use these to log in / onboard:`);
  after.forEach((u) => console.log(`  - ${u.employee_id || '?'} | ${u.email} | ${u.role} | ${u.name}`));
  console.log('\nHR can create real employees from: Campaign Hub → Onboarding → + Onboard New Employee');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
