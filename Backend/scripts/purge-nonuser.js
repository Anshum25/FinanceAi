import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function purge() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const keep = new Set(['users']);

  console.log('Connected. Purging all collections except:', Array.from(keep).join(', '));

  for (const coll of collections) {
    const name = coll.name;
    if (keep.has(name)) {
      console.log(`Skipping collection: ${name}`);
      continue;
    }
    if (name.startsWith('system.')) {
      console.log(`Skipping system collection: ${name}`);
      continue;
    }
    try {
      const collection = db.collection(name);
      const res = await collection.deleteMany({});
      console.log(`Cleared ${name}: deleted ${res.deletedCount ?? 0} documents.`);
    } catch (e) {
      console.error(`Error clearing ${name}:`, e.message);
    }
  }

  await mongoose.disconnect();
  console.log('Purge complete.');
}

purge().catch((e) => {
  console.error('Fatal purge error:', e);
  process.exit(1);
});
