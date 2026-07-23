const fs = require('fs');
const path = require('path');

// Helper to convert IPv4 string to integer
function ipToInt(ip) {
  if (!ip) return null;
  
  // Clean up client IP address (remove IPv6 prefix if present)
  let cleanedIp = ip;
  if (cleanedIp.startsWith('::ffff:')) {
    cleanedIp = cleanedIp.substring(7);
  }
  cleanedIp = cleanedIp.trim();
  
  const parts = cleanedIp.split('.');
  if (parts.length !== 4) return null;
  
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const val = parseInt(parts[i], 10);
    if (isNaN(val) || val < 0 || val > 255) return null;
    result = (result << 8) + val;
  }
  return result >>> 0; // Return unsigned 32-bit int
}

// Helper to check if IP is in CIDR range
function ipInCidr(ip, cidr) {
  if (!cidr.includes('/')) {
    return ip === cidr.trim();
  }
  
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

// IP whitelist middleware
function ipWhitelist(req, res, next) {
  // If IP Whitelisting is not configured in environment, skip validation
  if (!process.env.ALLOWED_IP_RANGES) {
    return next();
  }
  
  const allowedRanges = process.env.ALLOWED_IP_RANGES.split(',').map(r => r.trim()).filter(Boolean);
  
  // Extract client IP address
  let clientIp = req.ip || req.socket.remoteAddress || req.connection?.remoteAddress;
  
  // Clean up client IP address (remove IPv6 prefix if present)
  if (clientIp && clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }
  
  if (!clientIp) {
    console.warn(`[IP Whitelist Warning] Unable to retrieve client IP address.`);
    return res.status(403).json({ error: 'Access denied. Unable to verify network connection.' });
  }
  
  // Check if IP is in whitelist
  const isAllowed = allowedRanges.some(range => ipInCidr(clientIp, range));
  
  if (isAllowed) {
    return next();
  }
  
  // Log blocked attempt
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] BLOCKED login attempt from IP: ${clientIp}\n`;
  console.warn(`[IP Whitelist Blocked] ${logMessage.trim()}`);
  
  // Log to audit file
  try {
    const logPath = path.join(__dirname, '../logs');
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    fs.appendFileSync(path.join(logPath, 'blocked_attempts.log'), logMessage);
  } catch (err) {
    console.error('[IP Whitelist Error] Failed to write to blocked attempts log:', err);
  }
  
  return res.status(403).json({
    error: 'Access denied. Please connect to the office network to log in.'
  });
}

module.exports = {
  ipToInt,
  ipInCidr,
  ipWhitelist
};
