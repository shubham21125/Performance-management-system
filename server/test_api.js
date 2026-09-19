const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 5002}`;

async function runTests() {
  console.log('====================================================');
  console.log('Starting Performance Management System API Tests');
  console.log('Target Server:', BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper fetch
  async function api(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json };
  }

  // 1. Health check
  console.log('[Test Suite 1: Health Check]');
  const health = await api('/api/health');
  assert(health.status === 200 && health.data.success === true, `Health check responds 200 (db: ${health.data.db})`);

  // 2. Auth & JWT Verification Tests
  console.log('\n[Test Suite 2: Authentication & JWT Verification]');
  // Verify this server does NOT host /api/auth/login (must return 404)
  const loginAttempt = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'password' }),
  });
  assert(loginAttempt.status === 404, 'POST /api/auth/login returns 404 (Auth handled exclusively by central Auth module)');

  // Unauthenticated request
  const noAuth = await api('/api/auth/me');
  assert(noAuth.status === 401 && noAuth.data.success === false, 'Request with no token returns 401');

  // Bad token signature
  const badToken = await api('/api/auth/me', {
    headers: { Authorization: 'Bearer invalid.token.payload' },
  });
  assert(badToken.status === 401 && badToken.data.success === false, 'Invalid token returns 401');

  // Issue valid JWT tokens using shared JWT_SECRET (as issued by the central Auth module)
  const adminToken = jwt.sign({ employeeId: 6, roleId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const mgrToken = jwt.sign({ employeeId: 1, roleId: 2, reportingManagerId: null }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const empToken = jwt.sign({ employeeId: 3, roleId: 4, reportingManagerId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Admin token verification via GET /api/auth/me
  const adminMe = await api('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } });
  assert(adminMe.status === 200 && adminMe.data.user.role_id === 1, 'Admin JWT verified against DB (role_id: 1)');

  // Manager token verification via GET /api/auth/me
  const mgrMe = await api('/api/auth/me', { headers: { Authorization: `Bearer ${mgrToken}` } });
  assert(mgrMe.status === 200 && mgrMe.data.user.role_id === 2 && mgrMe.data.user.employee_id === 1, 'Manager JWT verified against DB (role_id: 2, employee_id: 1)');

  // Employee token verification via GET /api/auth/me
  const empMe = await api('/api/auth/me', { headers: { Authorization: `Bearer ${empToken}` } });
  assert(empMe.status === 200 && empMe.data.user.role_id === 4 && empMe.data.user.employee_id === 3, 'Employee JWT verified against DB (role_id: 4, employee_id: 3)');

  // 3. Reportees Dropdown
  console.log('\n[Test Suite 3: Employee Reportees Scope]');
  const adminReportees = await api('/api/employees/reportees', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminReportees.status === 200 && adminReportees.data.data.length >= 4, `Admin sees all active employees (${adminReportees.data.data.length} found)`);

  const mgrReportees = await api('/api/employees/reportees', {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(
    mgrReportees.status === 200 && mgrReportees.data.data.every((e) => e.reporting_manager_id === 1),
    `Manager sees only their direct reports (all reporting_manager_id === 1, count: ${mgrReportees.data.data.length})`
  );

  const empReportees = await api('/api/employees/reportees', {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(
    empReportees.status === 200 && empReportees.data.data.length === 1 && empReportees.data.data[0].employee_id === 3,
    'Employee sees only themselves in reportees dropdown'
  );

  // 4. Performance Reviews Visibility and Operations
  console.log('\n[Test Suite 4: Performance Review CRUD & Visibility]');
  
  // Employee attempting to create a review (should be 403)
  const empCreate = await api('/api/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      review_title: 'Unauthorized Self Review',
      employee_id: 3,
      review_date: new Date().toISOString(),
      review_period: 'Monthly',
      rating: 9,
      comments: 'Trying to create my own review',
    }),
  });
  assert(empCreate.status === 403, 'Employee is blocked from creating reviews (403 Forbidden)');

  // Manager attempting to create review for a non-reportee (employee 5 reports to 2, not 1)
  const mgrInvalidCreate = await api('/api/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({
      review_title: 'Out of chain review',
      employee_id: 5,
      review_date: new Date().toISOString(),
      review_period: 'Quarterly',
      rating: 7,
      comments: 'Should fail reporting chain check',
    }),
  });
  assert(mgrInvalidCreate.status === 403, 'Manager cannot review employee outside their reporting line (403)');

  // Manager creates valid review for direct reportee (employee 3 reports to 1)
  const mgrCreateValid = await api('/api/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({
      review_title: 'Q1 Performance Assessment',
      employee_id: 3,
      review_date: new Date().toISOString(),
      review_period: 'Quarterly',
      rating: 8,
      comments: 'Great progress on backend tasks and communication.',
    }),
  });
  assert(
    mgrCreateValid.status === 201 && mgrCreateValid.data.data.review_id > 0,
    `Manager creates review successfully (review_id: ${mgrCreateValid.data.data?.review_id})`
  );
  const createdReviewId = mgrCreateValid.data.data?.review_id;

  // Single review detail
  const getDetail = await api(`/api/reviews/${createdReviewId}`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(
    getDetail.status === 200 && getDetail.data.data.employee_name && getDetail.data.data.reviewer_name,
    `Single review detail fetched with populated employee and reviewer names`
  );

  // Employee can see their own review
  const empGetOwn = await api(`/api/reviews/${createdReviewId}`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empGetOwn.status === 200, 'Employee can view their own review');

  // Stats verification
  const statsRes = await api('/api/reviews/stats', {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(
    statsRes.status === 200 && statsRes.data.data.periodWiseCounts && statsRes.data.data.ratingBucketCounts,
    'Stats endpoint returns period-wise and rating-bucket breakdown'
  );

  // Update review
  const updateRes = await api(`/api/reviews/${createdReviewId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({
      rating: 9,
      comments: 'Updated: Exceptional quarterly progress.',
    }),
  });
  assert(updateRes.status === 200 && updateRes.data.data.rating === 9, 'Manager updates review successfully');

  // Employee attempting to update review (should be 403)
  const empUpdate = await api(`/api/reviews/${createdReviewId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ rating: 10 }),
  });
  assert(empUpdate.status === 403, 'Employee is blocked from updating review (403)');

  // Employee attempting to delete review (should be 403)
  const empDelete = await api(`/api/reviews/${createdReviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empDelete.status === 403, 'Employee is blocked from deleting review (403)');

  // Manager deletes review
  const mgrDelete = await api(`/api/reviews/${createdReviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(mgrDelete.status === 200, 'Manager deletes review successfully');

  // Accessing deleted review returns 404
  const afterDelete = await api(`/api/reviews/${createdReviewId}`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(afterDelete.status === 404, 'Accessing deleted review returns 404');

  console.log('\n====================================================');
  console.log(`Test Summary: Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
