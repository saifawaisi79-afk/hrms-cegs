import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export const JWT_SECRET = process.env.JWT_SECRET || 'hrms_super_secret_key_2026';

// Sign a JWT token
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Verify a JWT token — returns payload or null
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Extract and verify token from a Request object
export function getAuthUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

// ─── IP Whitelist Logic ───────────────────────────────────────────────────────

function ipToInt(ip) {
  if (!ip) return null;
  let cleanedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
  cleanedIp = cleanedIp.trim();
  const parts = cleanedIp.split('.');
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

export function checkIpAllowed(clientIp) {
  const allowedRanges = process.env.ALLOWED_IP_RANGES;
  if (!allowedRanges) return true; // No restriction configured
  const ranges = allowedRanges.split(',').map(r => r.trim()).filter(Boolean);
  let cleanIp = clientIp || '';
  if (cleanIp.startsWith('::ffff:')) cleanIp = cleanIp.substring(7);
  return ranges.some(range => ipInCidr(cleanIp, range));
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

// ─── Role Authorization ───────────────────────────────────────────────────────

export function requireRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
