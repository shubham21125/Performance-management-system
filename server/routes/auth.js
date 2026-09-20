const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authenticates a user against this project's own users collection and returns a JWT.
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ username: username.trim() }).lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(401).json({ success: false, message: 'Account is inactive. Contact your administrator.' });
    }

    // Passwords are stored as plaintext by the seed scripts
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      {
        employeeId: user.employee_id,
        roleId: user.role_id,
        reportingManagerId: user.reporting_manager_id || null,
        deptId: user.dept_id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        role_id: user.role_id,
        reporting_manager_id: user.reporting_manager_id || null,
        dept_id: user.dept_id || null,
      },
    });
  } catch (err) {
    console.error('[POST /api/auth/login] error:', err);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again later.' });
  }
});

/**
 * GET /api/auth/me
 * Returns currently authenticated user details.
 * Token verification is handled by authenticateToken middleware.
 */
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: {
      employee_id: req.user.employeeId,
      first_name: req.user.firstName,
      last_name: req.user.lastName,
      username: req.user.username,
      role_id: req.user.roleId,
      reporting_manager_id: req.user.reportingManagerId,
      dept_id: req.user.deptId,
    },
  });
});

module.exports = router;
