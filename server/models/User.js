const mongoose = require('mongoose');

/**
 * User model — Read-only mirror of the existing `users` collection
 * in the `employee_management` database.
 *
 * Does not alter or redefine the shared schema.
 * Mongoose ignores any extra fields stored by other modules.
 */
const userSchema = new mongoose.Schema(
  {
    employee_id: { type: Number, unique: true },
    role_id: { type: Number, default: null },
    reporting_manager_id: { type: Number, default: null },
    dept_id: { type: Number, default: null },
    status: { type: String, default: 'Active' },
    first_name: { type: String, maxlength: 100, default: '' },
    last_name: { type: String, maxlength: 100, default: '' },
    username: { type: String, maxlength: 100, default: '' },
    password: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    date_of_joining: { type: Date, default: null },
  },
  {
    strict: false,
    collection: 'users',
    timestamps: false,
  }
);

module.exports = mongoose.model('User', userSchema);
