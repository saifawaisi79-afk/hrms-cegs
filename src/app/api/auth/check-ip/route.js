import { NextResponse } from 'next/server';
import { getClientIp, checkIpAllowed } from '@/lib/auth';

export async function GET(request) {
  const clientIp = getClientIp(request);
  const allowed = checkIpAllowed(clientIp);
  if (!allowed) {
    return NextResponse.json({ error: 'Access denied. Please connect to the office network.' }, { status: 403 });
  }
  return NextResponse.json({ allowed: true });
}
