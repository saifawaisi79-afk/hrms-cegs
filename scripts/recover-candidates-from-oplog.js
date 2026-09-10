/**
 * READ-ONLY: reconstruct deleted candidates from replica-set oplog.
 * Writes recovery-sep9/candidates-from-oplog-*.json — does not write to Mongo.
 *
 * Run: node -r dotenv/config scripts/recover-candidates-from-oplog.js dotenv_config_path=.env.local
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

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  const outDir = path.join(process.cwd(), 'recovery-sep9');
  fs.mkdirSync(outDir, { recursive: true });

  await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 25000 });
  const oplog = mongoose.connection.client.db('local').collection('oplog.rs');
  const liveCol = mongoose.connection.db.collection('candidates');

  const ns = 'cegs_hrms.candidates';
  const wallStart = new Date('2026-09-08T00:00:00.000Z');
  const wallEnd = new Date('2026-09-11T00:00:00.000Z');

  const ops = await oplog
    .find({ ns, wall: { $gte: wallStart, $lt: wallEnd } })
    .sort({ ts: 1 })
    .toArray();

  const byId = new Map();
  const deletedIds = new Set();
  const opCounts = { i: 0, u: 0, d: 0, other: 0 };

  for (const op of ops) {
    if (op.op === 'i') {
      opCounts.i += 1;
      const doc = op.o;
      if (doc && doc._id) {
        byId.set(String(doc._id), { ...doc, _recoveredFrom: 'oplog-insert', _oplogWall: op.wall });
        deletedIds.delete(String(doc._id));
      }
    } else if (op.op === 'u') {
      opCounts.u += 1;
      const id = String((op.o2 && op.o2._id) || (op.o && op.o._id) || '');
      if (!id) continue;
      const prev = byId.get(id) || { _id: op.o2 && op.o2._id };
      const next = { ...prev, _recoveredFrom: 'oplog-update', _oplogWall: op.wall };
      if (op.o && op.o.$set) Object.assign(next, op.o.$set);
      else if (op.o && !op.o.$v && !op.o.$set) Object.assign(next, op.o);
      byId.set(id, next);
    } else if (op.op === 'd') {
      opCounts.d += 1;
      const id = String((op.o && op.o._id) || '');
      if (id) deletedIds.add(id);
    } else {
      opCounts.other += 1;
    }
  }

  const live = await liveCol.find({}, { projection: { _id: 1 } }).toArray();
  const liveIds = new Set(live.map((d) => String(d._id)));

  const allFromOplog = [...byId.values()];
  const missingFromLive = allFromOplog.filter((d) => !liveIds.has(String(d._id)));
  const sep9FromOplog = allFromOplog.filter((d) => normalizeCandidateDate(d.date) === '2026-09-09');
  const sep9Missing = missingFromLive.filter((d) => normalizeCandidateDate(d.date) === '2026-09-09');
  const deletedStillInMap = [...deletedIds]
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((d) => !liveIds.has(String(d._id)));

  const byEmp = {};
  sep9Missing.forEach((d) => {
    const emp = String(d.employee || '(blank)');
    byEmp[emp] = (byEmp[emp] || 0) + 1;
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    ns,
    oplogOpsInWindow: ops.length,
    opCounts,
    uniqueDocsBuiltFromInsertsUpdates: byId.size,
    missingFromLive: missingFromLive.length,
    sep9InOplogReplay: sep9FromOplog.length,
    sep9MissingFromLive: sep9Missing.length,
    sep9MissingByEmployee: byEmp,
    deleteOpsInWindow: opCounts.d,
    deletedIdsStillReconstructable: deletedStillInMap.length,
  };

  fs.writeFileSync(path.join(outDir, 'oplog-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(outDir, 'candidates-missing-from-live-oplog.json'),
    JSON.stringify(missingFromLive, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, 'candidates-2026-09-09-missing-from-live-oplog.json'),
    JSON.stringify(sep9Missing, null, 2)
  );

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
