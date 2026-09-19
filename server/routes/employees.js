const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

/**
 * GET /api/employees/reportees
 *
 * Returns employees the logged-in user can select in dropdowns:
 *  - Admin (role_id 1): all Active employees
 *  - Manager / Team Leader (role_id 2 or 3): Active employees reporting to req.user.employeeId
 *  - Employee (role_id 4): only themselves
 */
router.get('/reportees', authenticateToken, async (req, res) => {
  try {
    const { employeeId, roleId } = req.user;

    let query = { status: 'Active' };

    if (roleId === 1) {
      // Admin sees all active employees
    } else if (roleId === 2 || roleId === 3) {
      // Manager / TL sees only their direct reports
      query.reporting_manager_id = employeeId;
    } else {
      // Employee sees only themselves
      query.employee_id = employeeId;
    }

    const employees = await User.find(query)
      .select('employee_id first_name last_name role_id dept_id reporting_manager_id username -_id')
      .sort({ first_name: 1, last_name: 1 })
      .lean();

    return res.json({
      success: true,
      data: employees,
    });
  } catch (err) {
    console.error('GET /api/employees/reportees error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching reportees.',
    });
  }
});

module.exports = router;
