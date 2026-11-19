const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // 1. Update all candidates
  const candidatesColl = mongoose.connection.collection('candidates');
  const candCount = await candidatesColl.countDocuments();
  console.log(`Migrating ${candCount} candidates to uppercase...`);

  const candRes = await candidatesColl.updateMany({}, [
    {
      $set: {
        name: { $toUpper: { $ifNull: ['$name', ''] } },
        languages: { $toUpper: { $ifNull: ['$languages', ''] } },
        qualification: { $toUpper: { $ifNull: ['$qualification', ''] } },
        response: { $toUpper: { $ifNull: ['$response', ''] } },
        callStatus: { $toUpper: { $ifNull: ['$callStatus', ''] } },
        location: { $toUpper: { $ifNull: ['$location', ''] } },
        company: { $toUpper: { $ifNull: ['$company', ''] } },
        followUp1: { $toUpper: { $ifNull: ['$followUp1', ''] } },
        followUp2: { $toUpper: { $ifNull: ['$followUp2', ''] } },
        followUp3: { $toUpper: { $ifNull: ['$followUp3', ''] } },
      }
    }
  ]);
  console.log('Candidates migration result:', candRes);

  // 2. Update walkinselections
  const walkinsColl = mongoose.connection.collection('walkinselections');
  const walkinsRes = await walkinsColl.updateMany({}, [
    {
      $set: {
        name: { $toUpper: { $ifNull: ['$name', ''] } },
        company: { $toUpper: { $ifNull: ['$company', ''] } },
        process: { $toUpper: { $ifNull: ['$process', ''] } },
        rounds: { $toUpper: { $ifNull: ['$rounds', ''] } },
        furtherUpdate: { $toUpper: { $ifNull: ['$furtherUpdate', ''] } },
      }
    }
  ]);
  console.log('Walkins migration result:', walkinsRes);

  // 3. Update joinerentries
  const joinerColl = mongoose.connection.collection('joinerentries');
  const joiners = await joinerColl.find({}).toArray();
  console.log(`Checking ${joiners.length} joiner entries...`);
  let joinerUpdated = 0;

  for (const j of joiners) {
    const updates = {};
    if (j.company) updates.company = String(j.company).toUpperCase();
    if (j.process) updates.process = String(j.process).toUpperCase();
    if (j.name) updates.name = String(j.name).toUpperCase();

    // Check week1 through week8 for dates like (DD/MM/YYYY) and simplify to (DD/MM)
    const weekKeys = ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8'];
    for (const wk of weekKeys) {
      if (j[wk]) {
        // e.g. Working(22/10/2026) -> Active (22/10) or Working (22/10)
        const match = String(j[wk]).match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]\d{2,4})?\b/);
        if (match) {
          const d = match[1].padStart(2, '0');
          const m = match[2].padStart(2, '0');
          const cleanDate = `${d}/${m}`;
          // If status is Working or Active
          const lower = String(j[wk]).toLowerCase();
          const status = lower.includes('inactive') || lower.includes('drop') || lower.includes('left')
            ? 'Inactive'
            : lower.includes('active') || lower.includes('working')
            ? 'Active'
            : String(j[wk]).replace(/\s*\(.*?\)\s*/g, '').trim();
          updates[wk] = `${status} (${cleanDate})`;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await joinerColl.updateOne({ _id: j._id }, { $set: updates });
      joinerUpdated++;
    }
  }
  console.log(`Joiner entries updated: ${joinerUpdated}`);

  // Sample check on candidates
  const sample = await candidatesColl.find({}).limit(3).toArray();
  console.log('Sample candidate after migration:', sample);

  process.exit(0);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

