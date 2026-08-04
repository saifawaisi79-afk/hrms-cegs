import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lightweight DB probe for deployment diagnostics (no secrets exposed). */
export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true, db: 'connected' });
  } catch (error: any) {
    const msg = String(error?.message || 'connection failed');
    return NextResponse.json({ ok: false, db: 'error', hint: msg.slice(0, 120) }, { status: 503 });
  }
}
