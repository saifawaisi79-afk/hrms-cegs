/**
 * Insert oplog-recovered Sep 9 candidates that are missing from live Mongo.
 * Skips any _id that already exists. Does not update or delete existing docs.
 *
 * Run: node -r dotenv/config scripts/restore-sep9-missing-from-oplog.js dotenv_config_path=.env.local
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function toObjectId(id) {
  if (id && typeof id === 'object' && id.$oid) return new mongoose.Types.ObjectId(id.$oid);
  return new mongoose.Types.ObjectId(String(id));
}

function toDate(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  const src = path.join(
    process.cwd(),
    'recovery-sep9',
    'candidates-2026-09-09-missing-from-live-oplog.json'
  );
  const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (!Array.isArray(raw) || raw.length === 0) {
    console.log('No recovered rows to insert.');
    return;
  }

  await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 25000 });
  const col = mongoose.connection.db.collection('candidates');

  const docs = raw.map((row) => {
    const { _recoveredFrom, _oplogWall, __v, ...rest } = row;
    const doc = {
      ...rest,
      _id: toObjectId(row._id),
    };
    const createdAt = toDate(row.createdAt);
    const updatedAt = toDate(row.updatedAt);
    if (createdAt) doc.createdAt = createdAt;
    if (updatedAt) doc.updatedAt = updatedAt;
    return doc;
  });

  const ids = docs.map((d) => d._id);
  const already = await col.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
  const alreadySet = new Set(already.map((d) => String(d._id)));
  const toInsert = docs.filter((d) => !alreadySet.has(String(d._id)));

  let insertedCount = 0;
  if (toInsert.length) {
    const result = await col.insertMany(toInsert, { ordered: false });
    insertedCount = result.insertedCount || Object.keys(result.insertedIds || {}).length;
  }

  const after = await col.countDocuments({ date: '09/09/2026' });
  const byEmp = await col
    .aggregate([
      { $match: { date: '09/09/2026' } },
      { $group: { _id: '$employee', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();

  const report = {
    sourceRows: raw.length,
    alreadyPresent: alreadySet.size,
    attemptedInsert: toInsert.length,
    insertedCount,
    liveCountDate_09_09_2026: after,
    liveByEmployee: byEmp,
  };
  fs.writeFileSync(
    path.join(process.cwd(), 'recovery-sep9', 'restore-insert-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
