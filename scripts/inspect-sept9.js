const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 25000,
  });
  const col = mongoose.connection.collection('candidates');
  const start = new Date('2026-09-09T00:00:00.000Z');
  const noon = new Date('2026-09-09T12:30:00.000Z');
  const end = new Date('2026-09-10T00:00:00.000Z');

  const morning = await col
    .find({ createdAt: { $gte: start, $lt: noon } })
    .project({ name: 1, date: 1, employee: 1, createdAt: 1 })
    .toArray();
  console.log('created Sept 9 UTC before 12:30', morning.length);
  const byDate = {};
  const byEmp = {};
  morning.forEach((c) => {
    byDate[c.date] = (byDate[c.date] || 0) + 1;
    byEmp[c.employee] = (byEmp[c.employee] || 0) + 1;
  });
  console.log('by date field', byDate);
  console.log('by employee', byEmp);

  const ashwin = await col
    .find({ employee: /ashwin/i, date: '09/09/2026' })
    .project({ name: 1, date: 1, createdAt: 1 })
    .toArray();
  console.log('\nAshwin 09/09', ashwin.length);

  const ashwinCreated = await col
    .find({ employee: /ashwin/i, createdAt: { $gte: start, $lt: end } })
    .project({ name: 1, date: 1, createdAt: 1 })
    .toArray();
  console.log('Ashwin created Sept 9 UTC', ashwinCreated.length);
  ashwinCreated.forEach((c) => console.log(c.createdAt.toISOString(), c.date, c.name));

  const emp09 = await col
    .aggregate([
      { $match: { date: '09/09/2026' } },
      { $group: { _id: '$employee', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();
  console.log('\n09/09 by employee', emp09);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
