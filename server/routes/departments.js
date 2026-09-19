const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const authenticateToken = require('../middleware/auth');

/**
 * GET /api/departments
 * Returns list of active departments (used for Admin department filter)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const departments = await Department.find({ status: 'Active' })
      .select('dept_id dept_name description -_id')
      .sort({ dept_name: 1 })
      .lean();

    return res.json({
      success: true,
      data: departments,
    });
  } catch (err) {
    console.error('GET /api/departments error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching departments.',
    });
  }
});

module.exports = router;
