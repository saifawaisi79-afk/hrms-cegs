const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 25000,
  });
  const names = await mongoose.connection.db.listCollections().toArray();
  console.log(
    'collections',
    names.map((n) => n.name)
  );
  for (const n of names) {
    const c = await mongoose.connection.collection(n.name).countDocuments();
    console.log(n.name, c);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
