const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbQuery } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { ipWhitelist } = require('../middleware/ipWhitelist');

// GET /auth/check-ip - Endpoint to verify if client IP is whitelisted
router.get('/check-ip', ipWhitelist, (req, res) => {
  res.json({ allowed: true });
});

// POST /auth/login
router.post('/login', ipWhitelist, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login timestamp
    const nowStr = new Date().toISOString();
    await dbQuery.run('UPDATE users SET last_login = ? WHERE id = ?', [nowStr, user.id]);

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        avatar_url: user.avatar_url
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        designation: user.designation,
        joining_date: user.joining_date,
        contact: user.contact,
        status: user.status,
        avatar_url: user.avatar_url,
        last_login: nowStr
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /auth/session - Verify current session
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const user = await dbQuery.get(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User session no longer valid' });
    }

    res.json({
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        designation: user.designation,
        joining_date: user.joining_date,
        contact: user.contact,
        status: user.status,
        avatar_url: user.avatar_url,
        last_login: user.last_login
      }
    });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Server error fetching session' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await dbQuery.get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      // Return success anyway for security reasons, but with mock text
      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    // Mock reset code logic - we can set their password hash to 'Password123' if they request it, for convenient testing!
    const hash = await bcrypt.hash('Password123', 10);
    await dbQuery.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

    res.json({
      message: 'Password reset successful! Temporary password is "Password123". Please login and change it.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

module.exports = router;
