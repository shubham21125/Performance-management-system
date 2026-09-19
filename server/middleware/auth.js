const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Startup check for JWT_SECRET (fail-fast guard)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('FATAL: JWT_SECRET environment variable is missing or empty. Refusing to start.');
  process.exit(1);
}

/**
 * Authentication Middleware
 *
 * 1. Reads Bearer token from Authorization header.
 * 2. Verifies token using JWT_SECRET.
 * 3. Performs a live DB check against the users collection to verify the employee
 *    still exists and has status 'Active'.
 * 4. Attaches req.user = { employeeId, roleId, reportingManagerId, deptId }.
 *
 * Returns 401 on any authentication failure.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided. Please log in.',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token. Please log in again.';
    return res.status(401).json({ success: false, message });
  }

  try {
    const empId = decoded.employeeId ?? decoded.employee_id ?? decoded.id ?? decoded.userId;
    const employee = await User.findOne({ employee_id: empId }).lean();

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please log in again.',
      });
    }

    if (employee.status !== 'Active') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Contact your administrator.',
      });
    }

    // Attach fresh user info for role/reporting-hierarchy checks
    req.user = {
      employeeId: employee.employee_id,
      roleId: employee.role_id,
      reportingManagerId: employee.reporting_manager_id || null,
      deptId: employee.dept_id || null,
      firstName: employee.first_name || '',
      lastName: employee.last_name || '',
      username: employee.username || '',
    };

    next();
  } catch (err) {
    console.error('[auth middleware] DB lookup error:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again later.',
    });
  }
}

module.exports = authenticateToken;
