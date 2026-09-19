const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

/**
 * GET /api/auth/me
 * Returns currently authenticated user details.
 * Token verification is handled by authenticateToken middleware.
 * Login and token issuance are handled exclusively by the centralized Authentication module.
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
