const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

/**
 * PerformanceReview Model
 * Collection: performance_reviews
 *
 * Fields:
 *  - review_id: auto-incrementing integer, unique primary key
 *  - review_title: String, required, max length 100
 *  - review_date: Date, required
 *  - employee_id: Number, required (references users.employee_id)
 *  - reviewed_by: Number, required (references users.employee_id, set from req.user)
 *  - review_period: String, required, enum: ['Monthly', 'Quarterly', 'Annual']
 *  - rating: Number, required, min: 1, max: 10
 *  - comments: String, max length 300, default ''
 *  - created_at / updated_at: Date, managed by Mongoose timestamps
 */
const performanceReviewSchema = new mongoose.Schema(
  {
    review_id: {
      type: Number,
      unique: true,
      index: true,
    },
    review_title: {
      type: String,
      required: [true, 'Review title is required.'],
      maxlength: [100, 'Review title cannot exceed 100 characters.'],
      trim: true,
    },
    review_date: {
      type: Date,
      required: [true, 'Review date is required.'],
    },
    employee_id: {
      type: Number,
      required: [true, 'Employee ID is required.'],
      index: true,
    },
    reviewed_by: {
      type: Number,
      required: [true, 'Reviewer ID is required.'],
      index: true,
    },
    review_period: {
      type: String,
      required: [true, 'Review period is required.'],
      enum: {
        values: ['Monthly', 'Quarterly', 'Annual'],
        message: 'Review period must be Monthly, Quarterly, or Annual.',
      },
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required.'],
      min: [1, 'Rating must be at least 1.'],
      max: [10, 'Rating cannot exceed 10.'],
    },
    comments: {
      type: String,
      maxlength: [300, 'Comments cannot exceed 300 characters.'],
      trim: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'performance_reviews',
  }
);

// Auto-assign review_id before saving a new document using atomic shared counter
performanceReviewSchema.pre('save', async function (next) {
  if (this.isNew && !this.review_id) {
    try {
      this.review_id = await getNextSequence('review_id');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
