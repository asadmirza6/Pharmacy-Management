// User Management Routes (Admin Only)
// Handles user creation, deletion, and password reset

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../services/db');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.session.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.username, u.full_name, u.is_active, u.created_at, u.last_login, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
router.post('/', async (req, res) => {
  const { username, password, fullName, role } = req.body;

  // Validation
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required: username, password, fullName, role'
    });
  }

  // Validate role
  const validRoles = ['Admin', 'Billing', 'Stock'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    });
  }

  try {
    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get role_id
    const roleResult = await pool.query(
      'SELECT role_id FROM roles WHERE role_name = $1',
      [role]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    const roleId = roleResult.rows[0].role_id;

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, full_name, is_active, created_at`,
      [username, passwordHash, fullName, roleId]
    );

    const newUser = result.rows[0];

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.session.user.userId,
        'USER_CREATED',
        `Created user: ${username} with role: ${role}`,
        req.ip
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...newUser,
        role: role
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * POST /api/users/reset-password
 * Reset user password (Admin only)
 */
router.post('/reset-password', async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'User ID and new password are required'
    });
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT username FROM users WHERE user_id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const username = userCheck.rows[0].username;

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [passwordHash, userId]
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.session.user.userId,
        'PASSWORD_RESET',
        `Reset password for user: ${username}`,
        req.ip
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Delete user (Admin only) - Soft delete by setting is_active = false
 */
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT username FROM users WHERE user_id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const username = userCheck.rows[0].username;

    // Prevent deleting the main admin
    if (username === 'pharmacy_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete the main admin account'
      });
    }

    // Soft delete - set is_active to false
    await pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.session.user.userId,
        'USER_DELETED',
        `Deleted user: ${username}`,
        req.ip
      ]
    );

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

/**
 * GET /api/users/roles
 * Get available roles
 */
router.get('/roles', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT role_id, role_name, description FROM roles ORDER BY role_id'
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
});

module.exports = router;
