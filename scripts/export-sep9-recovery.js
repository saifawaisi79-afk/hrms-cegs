/**
 * READ-ONLY Sep 9 recovery export.
 * Writes JSON under recovery-sep9/ (gitignored). Does not insert/update/delete.
 *
 * Run: node -r dotenv/config scripts/export-sep9-recovery.js dotenv_config_path=.env.local
 */
const fs = require('fs');
const path = require('path');
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
  return '';
}

function isSep9(dateStr) {
  const n = normalizeCandidateDate(dateStr);
  return n === '2026-09-09';
}

function writeJson(outDir, name, data) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  const outDir = path.join(process.cwd(), 'recovery-sep9');
  fs.mkdirSync(outDir, { recursive: true });

  await mongoose.connect(uri, {
    family: 4,
    serverSelectionTimeoutMS: 25000,
  });

  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  const host = mongoose.connection.host;
  const collections = (await db.listCollections().toArray()).map((c) => c.name);

  const summary = {
    generatedAt: new Date().toISOString(),
    database: dbName,
    host,
    collections: {},
    atlasCliInstalled: false,
    atlasAdminApiKeysPresent: false,
    oplogReadable: false,
    oplogError: null,
    pitrRestoreToTempCluster: 'not_possible_from_this_machine',
    notes: [],
  };

  for (const name of collections) {
    summary.collections[name] = await db.collection(name).countDocuments();
  }

  // Live leftover 09/09/2026 candidates (evening re-entry + any survivors)
  const allCands = await db.collection('candidates').find({}).toArray();
  const leftoverSep9 = allCands.filter((c) => isSep9(c.date));
  const leftoverByEmp = {};
  leftoverSep9.forEach((c) => {
    const emp = String(c.employee || '(blank)');
    leftoverByEmp[emp] = (leftoverByEmp[emp] || 0) + 1;
  });
  writeJson(outDir, 'candidates-live-2026-09-09.json', leftoverSep9);
  summary.liveCandidatesSep9 = leftoverSep9.length;
  summary.liveCandidatesSep9ByEmployee = leftoverByEmp;

  const wipeCutoff = new Date('2026-09-09T12:30:00.000Z');
  const morningCreated = leftoverSep9.filter(
    (c) => c.createdAt && new Date(c.createdAt) < wipeCutoff
  );
  summary.liveSep9CreatedBeforeWipeCutoffUtc = morningCreated.length;

  // Walk-ins / joiners (partial reconstruct)
  let walkins = [];
  let joiners = [];
  if (collections.includes('walkinselections')) {
    walkins = await db.collection('walkinselections').find({}).toArray();
  }
  if (collections.includes('joinerentries')) {
    joiners = await db.collection('joinerentries').find({}).toArray();
  }

  const walkinsSep9 = walkins.filter(
    (r) =>
      isSep9(r.date) ||
      (r.createdAt && new Date(r.createdAt).toISOString().slice(0, 10) === '2026-09-09')
  );
  const joinersSep9 = joiners.filter((r) => {
    const dates = [r.dateOfJoining, r.interviewDate, r.billingDate, r.date];
    if (dates.some(isSep9)) return true;
    if (r.createdAt && new Date(r.createdAt).toISOString().slice(0, 10) === '2026-09-09') return true;
    return false;
  });

  writeJson(outDir, 'walkinselections-2026-09-09.json', walkinsSep9);
  writeJson(outDir, 'joinerentries-2026-09-09.json', joinersSep9);
  writeJson(outDir, 'walkinselections-all.json', walkins);
  writeJson(outDir, 'joinerentries-all.json', joiners);
  summary.walkinsSep9 = walkinsSep9.length;
  summary.walkinsAll = walkins.length;
  summary.joinersSep9 = joinersSep9.length;
  summary.joinersAll = joiners.length;

  // Oplog (Atlas app users usually cannot read this)
  try {
    const oplog = mongoose.connection.client.db('local').collection('oplog.rs');
    const sample = await oplog.find({}).sort({ ts: -1 }).limit(1).toArray();
    summary.oplogReadable = true;
    summary.oplogLatestSampleKeys = sample[0] ? Object.keys(sample[0]) : [];
    summary.notes.push('Oplog is readable — deleted inserts may be recoverable from oplog; inspect separately.');
  } catch (err) {
    summary.oplogReadable = false;
    summary.oplogError = err.message;
    summary.notes.push(
      'Cannot read local.oplog.rs with this database user. PITR/snapshot restore must be done in Atlas UI (not possible via this script).'
    );
  }

  // Atlas programmatic restore needs org API keys — not present in .env
  const hasAtlasKeys = Boolean(
    process.env.ATLAS_PUBLIC_KEY ||
      process.env.MONGODB_ATLAS_PUBLIC_API_KEY ||
      process.env.ATLAS_API_KEY
  );
  summary.atlasAdminApiKeysPresent = hasAtlasKeys;
  if (!hasAtlasKeys) {
    summary.notes.push(
      'No Atlas Admin API keys in env. Cannot create a temporary restore cluster from this repo. Use cloud.mongodb.com → cluster hrmscegs → Backup, restore to a NEW cluster, then merge missing candidates.'
    );
  }

  writeJson(outDir, 'summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
