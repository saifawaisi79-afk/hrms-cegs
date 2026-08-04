import jwt from 'jsonwebtoken';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET is required. Set it in Vercel → Settings → Environment Variables (Production).'
    );
  }
  return secret;
}

export function getJwtSecret(): string {
  return resolveJwtSecret();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUserPayload {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department_id: string | null;
  avatar_url?: string;
  [key: string]: any;
}

// ─── JWT Helpers ──────────────────────────────────────────────────────────────

export function signToken(payload: object): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

/** Short-lived attestation that GPS was within office geofence (WFO login). */
export function signLocationToken(payload: {
  purpose: 'wfo_login';
  lat: number;
  lng: number;
  dist: number;
}): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '5m' });
}

export type LocationTokenPayload = {
  purpose: string;
  lat: number;
  lng: number;
  dist: number;
  iat?: number;
  exp?: number;
};

export function verifyLocationToken(token: string): LocationTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as LocationTokenPayload;
    if (decoded?.purpose !== 'wfo_login') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthUserPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(request: Request): AuthUserPayload | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

// ─── IP Whitelist Logic ───────────────────────────────────────────────────────

function normalizeIp(ip: string | null | undefined): string {
  if (!ip) return '';
  ip = ip.trim();
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  return ip;
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const val = parseInt(parts[i], 10);
    if (isNaN(val) || val < 0 || val > 255) return null;
    result = (result << 8) + val;
  }
  return result >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr.trim();

  const [rangeIp, maskBitsStr] = cidr.split('/');
  const maskBits = parseInt(maskBitsStr, 10);
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;

  const ipInt = ipToInt(ip);
  const rangeIpInt = ipToInt(rangeIp);
  if (ipInt === null || rangeIpInt === null) return false;
  if (maskBits === 0) return true;

  const mask = (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (rangeIpInt & mask);
}

/**
 * Check if a client IP is in the configured ALLOWED_IP_RANGES.
 * If ALLOWED_IP_RANGES is not set or empty → allow all (open mode).
 */
export function checkIpAllowed(clientIp: string | null | undefined): boolean {
  const allowedRanges = process.env.ALLOWED_IP_RANGES;
  if (!allowedRanges || allowedRanges.trim() === '') return true;

  const ranges = allowedRanges.split(',').map((r) => r.trim()).filter(Boolean);
  const cleanIp = normalizeIp(clientIp);

  if (!cleanIp) return false;

  return ranges.some((range) => ipInCidr(cleanIp, range));
}

export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

export function requireRole(user: AuthUserPayload | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
