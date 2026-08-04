import mongoose from 'mongoose';

/** Normalize Vercel / .env paste mistakes (quotes, duplicated key prefix, whitespace). */
function normalizeMongoUri(raw: string | undefined): string {
  let uri = String(raw ?? '').trim();
  if (!uri) return '';

  // Strip wrapping quotes from dashboard paste
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }

  // User pasted full .env line into Vercel "Value" field
  if (uri.toUpperCase().startsWith('MONGODB_URI=')) {
    uri = uri.slice(uri.indexOf('=') + 1).trim();
    if (
      (uri.startsWith('"') && uri.endsWith('"')) ||
      (uri.startsWith("'") && uri.endsWith("'"))
    ) {
      uri = uri.slice(1, -1).trim();
    }
  }

  return uri;
}

function getMongoUri(): string {
  const uri = normalizeMongoUri(process.env.MONGODB_URI);
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not defined. Add it in Vercel → Settings → Environment Variables (Production).'
    );
  }
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      `Invalid MONGODB_URI scheme. Value must start with mongodb:// or mongodb+srv:// (check Vercel env — no quotes, no "MONGODB_URI=" prefix).`
    );
  }
  return uri;
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
  if (cached!.conn) return cached!.conn;

  const MONGODB_URI = getMongoUri();

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    cached!.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log('MongoDB connected:', m.connection.host);
        return m;
      })
      .catch((err) => {
        cached!.promise = null;
        console.error('MongoDB connection error:', err.message);
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
