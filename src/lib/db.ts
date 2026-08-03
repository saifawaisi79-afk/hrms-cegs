import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    '❌ MONGODB_URI is not defined. Please add it to your .env.local file.'
  );
}

/**
 * Global singleton cache to prevent Next.js hot-reload from creating
 * multiple simultaneous connections to MongoDB Atlas.
 */
declare global {
  var _mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global._mongoose;

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
  // Already connected — reuse
  if (cached!.conn) return cached!.conn;

  // Connection in progress — wait for it
  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached!.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then((m) => {
        console.log('✅ MongoDB connected to:', m.connection.host);
        return m;
      })
      .catch((err) => {
        cached!.promise = null; // Reset so next call retries
        console.error('❌ MongoDB connection error:', err.message);
        throw err;
      });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
