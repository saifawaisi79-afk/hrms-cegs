/**
 * Production prep: remove sample / demo accounts from MongoDB.
 * Keeps Super Admin accounts and real employees onboarded via HR.
 *
 * Run: node scripts/clear-demo-users.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const REMOVE_EMAILS = [
  'employee@cegs.com',
  'demo@cegs.com',
  'test@cegs.com',
  'nusrath@cegs.com', // sample HR portal login
  'superadmin@cegs.com', // duplicate CEO demo Super Admin
];

const REMOVE_EMPLOYEE_IDS = ['EMP-DEMO', 'DEMO-001', 'TEST-001', 'EMP-001', 'EMP-002'];

/** Never delete production Super Admin or onboarded staff */
const KEEP_EMAILS = ['saifawaisi79@gmail.com'];

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
    $and: [
      { email: { $nin: KEEP_EMAILS } },
      {
        $or: [
          { email: { $in: REMOVE_EMAILS } },
          { employee_id: { $in: REMOVE_EMPLOYEE_IDS } },
          { email: /demo/i },
          { name: /^Demo\b/i },
        ],
      },
    ],
  });

  console.log(`\nRemoved ${result.deletedCount} sample/demo user(s).\n`);

  const after = await col.find({}).project({ email: 1, employee_id: 1, name: 1, role: 1 }).toArray();
  console.log(`Remaining accounts (${after.length}):`);
  after.forEach((u) => console.log(`  - ${u.employee_id || '?'} | ${u.email} | ${u.role} | ${u.name}`));
  console.log('\nReal employees stay. HR Admin must be onboarded with Admin role if needed.');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
