const jwt = require('jsonwebtoken');
const { dbQuery } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'hrms_super_secret_key_2026';

// General JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Role-based access control middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
  };
}

// Scoped RBAC based on permissions config OR standard role mappings
async function checkPermission(module, action) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, id } = req.user;

    // Super Admin has all permissions automatically
    if (role === 'super_admin') {
      return next();
    }

    try {
      // Fetch permissions for this role
      const record = await dbQuery.get('SELECT permissions_json FROM roles_permissions WHERE role_name = ?', [role]);
      if (record) {
        const permissions = JSON.parse(record.permissions_json);
        // permissions format: { [module]: { view: true, create: true, edit: true, delete: true, approve: true } }
        if (permissions[module] && permissions[module][action]) {
          return next();
        }
      }
    } catch (err) {
      console.error('Permission check error:', err);
    }

    // Fallback standard rules if no custom mapping is found
    if (role === 'admin') {
      // Admin gets everything except user management & global company settings modifications
      if (module === 'users' || module === 'system_settings') {
        return res.status(403).json({ error: 'Forbidden: Admin cannot manage users/settings' });
      }
      return next();
    }

    // Employee has minimal access: can only check/write their own info
    // (This scoping is checked in route handlers directly or filtered using req.user.id)
    res.status(403).json({ error: `Forbidden: No permission to ${action} ${module}` });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  checkPermission,
  JWT_SECRET
};
