const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    dept_id: { type: Number, unique: true },
    dept_name: { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, maxlength: 300, trim: true, default: '' },
    status: { type: String, default: 'Active' },
  },
  {
    collection: 'departments',
    timestamps: false,
  }
);

module.exports = mongoose.model('Department', departmentSchema);
