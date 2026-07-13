// Authentication Routes
// Handles login, logout, and session management

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../services/db');

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  try {
    // Find user by username
    const result = await pool.query(
      `SELECT u.*, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.username = $1 AND u.is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      // Log failed attempt
      await pool.query(
        'INSERT INTO audit_logs (action, details, ip_address) VALUES ($1, $2, $3)',
        ['LOGIN_FAILED', `Failed login attempt for username: ${username}`, req.ip]
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const user = result.rows[0];

    // Verify password using BCrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Log failed attempt
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
        [user.user_id, 'LOGIN_FAILED', 'Invalid password', req.ip]
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Log successful login
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [user.user_id, 'LOGIN_SUCCESS', 'User logged in successfully', req.ip]
    );

    // Create session
    req.session.user = {
      userId: user.user_id,
      username: user.username,
      fullName: user.full_name,
      role: user.role_name
    };

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy user session
 */
router.post('/logout', (req, res) => {
  const userId = req.session.user?.userId;

  // Log logout
  if (userId) {
    pool.query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [userId, 'LOGOUT', req.ip]
    ).catch(err => console.error('Logout log error:', err));
  }

  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/auth/session
 * Check if user is authenticated and return session info
 */
router.get('/session', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  res.status(200).json({
    success: true,
    user: req.session.user
  });
});

/**
 * GET /api/auth/check-role/:role
 * Check if current user has specific role
 */
router.get('/check-role/:role', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  const hasRole = req.session.user.role === req.params.role;

  res.status(200).json({
    success: true,
    hasRole: hasRole,
    currentRole: req.session.user.role
  });
});

module.exports = router;
