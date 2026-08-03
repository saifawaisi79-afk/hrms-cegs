import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'cegshrmssecret12345';

// ─── JWT Helpers ──────────────────────────────────────────────────────────────

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getAuthUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

// ─── IP Whitelist Logic ───────────────────────────────────────────────────────

function normalizeIp(ip) {
  if (!ip) return '';
  ip = ip.trim();
  // Unwrap IPv4-mapped IPv6 addresses (::ffff:192.168.1.1 → 192.168.1.1)
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  return ip;
}

function ipToInt(ip) {
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

function ipInCidr(ip, cidr) {
  // Exact match (handles IPv6 literals like ::1 and plain IPs)
  if (!cidr.includes('/')) return ip === cidr.trim();

  const [rangeIp, maskBitsStr] = cidr.split('/');
  const maskBits = parseInt(maskBitsStr, 10);
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;

  const ipInt = ipToInt(ip);
  const rangeIpInt = ipToInt(rangeIp);
  if (ipInt === null || rangeIpInt === null) return false;
  if (maskBits === 0) return true;

  const mask = ((0xffffffff << (32 - maskBits)) >>> 0);
  return (ipInt & mask) === (rangeIpInt & mask);
}

/**
 * Check if a client IP is in the configured ALLOWED_IP_RANGES.
 * Supports: IPv4, CIDR notation, IPv4-mapped IPv6, raw IPv6 literals (e.g. ::1).
 * If ALLOWED_IP_RANGES is not set or empty → allow all (open mode).
 */
export function checkIpAllowed(clientIp) {
  const allowedRanges = process.env.ALLOWED_IP_RANGES;
  // No whitelist configured → allow everyone
  if (!allowedRanges || allowedRanges.trim() === '') return true;

  const ranges = allowedRanges.split(',').map(r => r.trim()).filter(Boolean);
  const cleanIp = normalizeIp(clientIp);

  if (!cleanIp) return false;

  return ranges.some(range => ipInCidr(cleanIp, range));
}

/**
 * Extract the real client IP from a Next.js Request object.
 * Respects x-forwarded-for (Vercel/CDN) when TRUST_PROXY=true.
 */
export function getClientIp(request) {
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

// ─── Role Authorization ───────────────────────────────────────────────────────

export function requireRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
