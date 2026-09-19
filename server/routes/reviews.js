const express = require('express');
const router = express.Router();
const PerformanceReview = require('../models/PerformanceReview');
const User = require('../models/User');
const Department = require('../models/Department');
const authenticateToken = require('../middleware/auth');

/**
 * Helper: buildVisibilityFilter
 *
 * Enforces role-based visibility server-side:
 * - Admin (role_id 1): sees ALL reviews in the system.
 * - Manager / Team Leader (role_id 2 or 3): sees reviews where employee_id is
 *   a direct reportee OR reviews they personally created (reviewed_by === employeeId).
 * - Employee (role_id 4): sees ONLY their own reviews (employee_id === employeeId).
 */
async function buildVisibilityFilter(user) {
  const { employeeId, roleId } = user;

  if (roleId === 1) {
    // Admin sees everything
    return {};
  }

  if (roleId === 2 || roleId === 3) {
    // Direct reports
    const reportees = await User.find(
      { reporting_manager_id: employeeId, status: 'Active' },
      { employee_id: 1, _id: 0 }
    ).lean();
    const reporteeIds = reportees.map((r) => r.employee_id);

    return {
      $or: [
        { reviewed_by: employeeId },
        { employee_id: { $in: reporteeIds } },
      ],
    };
  }

  // Employee (role_id 4)
  return { employee_id: employeeId };
}

/**
 * Helper: checkReportingChain
 * Validates whether the logged-in user is authorized to create/modify a review
 * for the target employee_id.
 * - Admin: allowed for any active employee
 * - Manager / TL: allowed ONLY if target employee is active and directly reports to them
 * - Employee: disallowed
 */
async function checkReportingChain(user, targetEmployeeId) {
  const { employeeId, roleId } = user;

  if (roleId === 4) {
    return { allowed: false, status: 403, message: 'Employees are not permitted to manage reviews.' };
  }

  const target = await User.findOne({ employee_id: targetEmployeeId }).lean();
  if (!target) {
    return { allowed: false, status: 404, message: `Employee with ID ${targetEmployeeId} not found.` };
  }

  if (target.status !== 'Active') {
    return { allowed: false, status: 400, message: 'Cannot create or modify review for an inactive employee.' };
  }

  if (roleId === 1) {
    return { allowed: true, target };
  }

  if (roleId === 2 || roleId === 3) {
    if (target.reporting_manager_id !== employeeId) {
      return {
        allowed: false,
        status: 403,
        message: 'You can only manage reviews for employees who report directly to you.',
      };
    }
    return { allowed: true, target };
  }

  return { allowed: false, status: 403, message: 'Unauthorized.' };
}

/**
 * Helper: buildQueryFilters
 * Combines visibility filter with client query parameters.
 */
async function buildQueryFilters(user, query) {
  const visibilityFilter = await buildVisibilityFilter(user);
  const conditions = [visibilityFilter];

  // Specific employee filter
  if (query.employeeId) {
    const eid = Number(query.employeeId);
    if (!isNaN(eid)) {
      conditions.push({ employee_id: eid });
    }
  }

  // Period filter
  if (query.period && ['Monthly', 'Quarterly', 'Annual'].includes(query.period)) {
    conditions.push({ review_period: query.period });
  }

  // Review Date Range filter
  if (query.startDateFrom || query.startDateTo) {
    const dateQuery = {};
    if (query.startDateFrom) {
      const from = new Date(query.startDateFrom);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        dateQuery.$gte = from;
      }
    }
    if (query.startDateTo) {
      const to = new Date(query.startDateTo);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        dateQuery.$lte = to;
      }
    }
    if (Object.keys(dateQuery).length > 0) {
      conditions.push({ review_date: dateQuery });
    }
  }

  // Rating Bucket filter
  if (query.ratingBucket) {
    if (query.ratingBucket === '1-5') {
      conditions.push({ rating: { $gte: 1, $lte: 5 } });
    } else if (query.ratingBucket === '6-8') {
      conditions.push({ rating: { $gte: 6, $lte: 8 } });
    } else if (query.ratingBucket === '9+') {
      conditions.push({ rating: { $gte: 9, $lte: 10 } });
    }
  }

  // Admin Department filter (only Admin can filter by department)
  if (user.roleId === 1 && query.department) {
    const deptId = Number(query.department);
    if (!isNaN(deptId)) {
      const deptEmployees = await User.find({ dept_id: deptId }, { employee_id: 1 }).lean();
      const empIds = deptEmployees.map((e) => e.employee_id);
      conditions.push({ employee_id: { $in: empIds } });
    }
  }

  // Employee name search filter
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    const matchedEmployees = await User.find(
      {
        $or: [
          { first_name: searchRegex },
          { last_name: searchRegex },
          { username: searchRegex },
        ],
      },
      { employee_id: 1 }
    ).lean();
    const matchedEmpIds = matchedEmployees.map((e) => e.employee_id);

    conditions.push({
      $or: [
        { employee_id: { $in: matchedEmpIds } },
        { review_title: searchRegex },
      ],
    });
  }

  if (conditions.length === 1) {
    return conditions[0];
  }
  return { $and: conditions };
}

/**
 * Helper: populateReviewDetails
 * Enriches review records with employee names, reviewer names, and department info.
 */
async function populateReviewDetails(reviews) {
  if (!reviews || reviews.length === 0) return [];

  const employeeIds = new Set();
  reviews.forEach((r) => {
    if (r.employee_id) employeeIds.add(r.employee_id);
    if (r.reviewed_by) employeeIds.add(r.reviewed_by);
  });

  const [users, departments] = await Promise.all([
    User.find({ employee_id: { $in: Array.from(employeeIds) } })
      .select('employee_id first_name last_name username dept_id role_id')
      .lean(),
    Department.find().select('dept_id dept_name').lean(),
  ]);

  const userMap = new Map();
  users.forEach((u) => userMap.set(u.employee_id, u));

  const deptMap = new Map();
  departments.forEach((d) => deptMap.set(d.dept_id, d.dept_name));

  return reviews.map((r) => {
    const reviewedEmp = userMap.get(r.employee_id);
    const reviewerEmp = userMap.get(r.reviewed_by);

    const empDeptName = reviewedEmp && reviewedEmp.dept_id ? deptMap.get(reviewedEmp.dept_id) || 'N/A' : 'N/A';

    return {
      ...r,
      employee_name: reviewedEmp ? `${reviewedEmp.first_name} ${reviewedEmp.last_name}`.trim() || reviewedEmp.username : `Employee #${r.employee_id}`,
      employee_dept_id: reviewedEmp ? reviewedEmp.dept_id : null,
      employee_dept_name: empDeptName,
      reviewer_name: reviewerEmp ? `${reviewerEmp.first_name} ${reviewerEmp.last_name}`.trim() || reviewerEmp.username : `Reviewer #${r.reviewed_by}`,
    };
  });
}

// ---------------------------------------------------------------------------
// 1. GET /api/reviews — Paginated, filterable list
// ---------------------------------------------------------------------------
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const mongoFilter = await buildQueryFilters(req.user, req.query);

    const [total, rawReviews] = await Promise.all([
      PerformanceReview.countDocuments(mongoFilter),
      PerformanceReview.find(mongoFilter)
        .sort({ review_date: -1, review_id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const populated = await populateReviewDetails(rawReviews);

    return res.json({
      success: true,
      data: populated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching performance reviews.' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/reviews/stats — Period counts and Rating buckets
// ---------------------------------------------------------------------------
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const mongoFilter = await buildQueryFilters(req.user, req.query);

    // Fetch all reviews matching current visibility and filters
    const matchingReviews = await PerformanceReview.find(mongoFilter)
      .select('employee_id review_period rating')
      .lean();

    // Period-wise counts
    const periodCounts = {
      Monthly: 0,
      Quarterly: 0,
      Annual: 0,
    };

    // Rating bucket sets (counting DISTINCT employees falling in each bucket)
    const ratingBucketEmployees = {
      '1-5': new Set(),
      '6-8': new Set(),
      '9+': new Set(),
    };

    // Review counts per rating bucket
    const ratingBucketReviewCounts = {
      '1-5': 0,
      '6-8': 0,
      '9+': 0,
    };

    matchingReviews.forEach((r) => {
      // Period
      if (periodCounts[r.review_period] !== undefined) {
        periodCounts[r.review_period]++;
      }

      // Rating buckets
      if (r.rating >= 1 && r.rating <= 5) {
        ratingBucketEmployees['1-5'].add(r.employee_id);
        ratingBucketReviewCounts['1-5']++;
      } else if (r.rating >= 6 && r.rating <= 8) {
        ratingBucketEmployees['6-8'].add(r.employee_id);
        ratingBucketReviewCounts['6-8']++;
      } else if (r.rating >= 9 && r.rating <= 10) {
        ratingBucketEmployees['9+'].add(r.employee_id);
        ratingBucketReviewCounts['9+']++;
      }
    });

    return res.json({
      success: true,
      data: {
        totalReviews: matchingReviews.length,
        periodWiseCounts: periodCounts,
        // Rating Vs Total Number of Employees (distinct employees per bucket)
        ratingBucketCounts: {
          '1-5': ratingBucketEmployees['1-5'].size,
          '6-8': ratingBucketEmployees['6-8'].size,
          '9+': ratingBucketEmployees['9+'].size,
        },
        ratingBucketReviewCounts,
      },
    });
  } catch (err) {
    console.error('GET /api/reviews/stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error calculating review statistics.' });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /api/reviews/:id — Single review detail (respects visibility)
// ---------------------------------------------------------------------------
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const idParam = req.params.id;
    const numId = Number(idParam);

    let query;
    if (!isNaN(numId)) {
      query = { review_id: numId };
    } else {
      query = { _id: idParam };
    }

    const review = await PerformanceReview.findOne(query).lean();
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    // Check visibility scope
    const visibilityFilter = await buildVisibilityFilter(req.user);
    const isVisible = await PerformanceReview.findOne({ _id: review._id, ...visibilityFilter });

    if (!isVisible) {
      // Return 404 (not 403) so existence is not leaked
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const [populated] = await populateReviewDetails([review]);

    return res.json({
      success: true,
      data: populated,
    });
  } catch (err) {
    console.error('GET /api/reviews/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching review.' });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /api/reviews — Create new review
// ---------------------------------------------------------------------------
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.roleId === 4) {
      return res.status(403).json({
        success: false,
        message: 'Employees are not permitted to create performance reviews.',
      });
    }

    const { review_title, employee_id, review_date, review_period, rating, comments } = req.body;

    // Field validations
    if (!review_title || !review_title.trim()) {
      return res.status(400).json({ success: false, message: 'Review title is required.' });
    }
    if (review_title.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Review title cannot exceed 100 characters.' });
    }

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Employee selection is required.' });
    }

    if (!review_date) {
      return res.status(400).json({ success: false, message: 'Review date is required.' });
    }
    const parsedDate = new Date(review_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid review date.' });
    }

    if (!review_period || !['Monthly', 'Quarterly', 'Annual'].includes(review_period)) {
      return res.status(400).json({
        success: false,
        message: 'Review period must be Monthly, Quarterly, or Annual.',
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 10) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 10.',
      });
    }

    if (comments && comments.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Comments cannot exceed 300 characters.',
      });
    }

    // Reporting chain check
    const chainCheck = await checkReportingChain(req.user, Number(employee_id));
    if (!chainCheck.allowed) {
      return res.status(chainCheck.status || 403).json({
        success: false,
        message: chainCheck.message,
      });
    }

    // Create review: reviewed_by is strictly set from req.user.employeeId
    const newReview = new PerformanceReview({
      review_title: review_title.trim(),
      review_date: parsedDate,
      employee_id: Number(employee_id),
      reviewed_by: req.user.employeeId,
      review_period,
      rating: Math.round(numRating),
      comments: (comments || '').trim(),
    });

    await newReview.save();

    const [populated] = await populateReviewDetails([newReview.toObject()]);

    return res.status(201).json({
      success: true,
      message: 'Performance review created successfully.',
      data: populated,
    });
  } catch (err) {
    console.error('POST /api/reviews error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating review.' });
  }
});

// ---------------------------------------------------------------------------
// 5. PUT /api/reviews/:id — Update review
// ---------------------------------------------------------------------------
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.roleId === 4) {
      return res.status(403).json({
        success: false,
        message: 'Employees are not permitted to edit performance reviews.',
      });
    }

    const idParam = req.params.id;
    const numId = Number(idParam);
    const query = !isNaN(numId) ? { review_id: numId } : { _id: idParam };

    const review = await PerformanceReview.findOne(query);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    // Visibility check
    const visibilityFilter = await buildVisibilityFilter(req.user);
    const isVisible = await PerformanceReview.findOne({ _id: review._id, ...visibilityFilter });
    if (!isVisible) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const { review_title, employee_id, review_date, review_period, rating, comments } = req.body;

    if (review_title !== undefined) {
      if (!review_title.trim()) {
        return res.status(400).json({ success: false, message: 'Review title cannot be empty.' });
      }
      if (review_title.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'Review title cannot exceed 100 characters.' });
      }
      review.review_title = review_title.trim();
    }

    if (employee_id !== undefined && Number(employee_id) !== review.employee_id) {
      const chainCheck = await checkReportingChain(req.user, Number(employee_id));
      if (!chainCheck.allowed) {
        return res.status(chainCheck.status || 403).json({
          success: false,
          message: chainCheck.message,
        });
      }
      review.employee_id = Number(employee_id);
    }

    if (review_date !== undefined) {
      const parsedDate = new Date(review_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid review date.' });
      }
      review.review_date = parsedDate;
    }

    if (review_period !== undefined) {
      if (!['Monthly', 'Quarterly', 'Annual'].includes(review_period)) {
        return res.status(400).json({
          success: false,
          message: 'Review period must be Monthly, Quarterly, or Annual.',
        });
      }
      review.review_period = review_period;
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 10) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 10.',
        });
      }
      review.rating = Math.round(numRating);
    }

    if (comments !== undefined) {
      if (comments.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Comments cannot exceed 300 characters.',
        });
      }
      review.comments = comments.trim();
    }

    await review.save();

    const [populated] = await populateReviewDetails([review.toObject()]);

    return res.json({
      success: true,
      message: 'Review updated successfully.',
      data: populated,
    });
  } catch (err) {
    console.error('PUT /api/reviews/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating review.' });
  }
});

// ---------------------------------------------------------------------------
// 6. DELETE /api/reviews/:id — Delete review
// ---------------------------------------------------------------------------
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.roleId === 4) {
      return res.status(403).json({
        success: false,
        message: 'Employees are not permitted to delete performance reviews.',
      });
    }

    const idParam = req.params.id;
    const numId = Number(idParam);
    const query = !isNaN(numId) ? { review_id: numId } : { _id: idParam };

    const review = await PerformanceReview.findOne(query);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    // Visibility check
    const visibilityFilter = await buildVisibilityFilter(req.user);
    const isVisible = await PerformanceReview.findOne({ _id: review._id, ...visibilityFilter });
    if (!isVisible) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    await PerformanceReview.deleteOne({ _id: review._id });

    return res.json({
      success: true,
      message: 'Performance review deleted successfully.',
    });
  } catch (err) {
    console.error('DELETE /api/reviews/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting review.' });
  }
});

module.exports = router;
