const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    role_id: { type: Number, unique: true },
    role_name: { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, maxlength: 300, trim: true, default: '' },
    status: { type: String, default: 'Active' },
  },
  {
    collection: 'roles',
    timestamps: false,
  }
);

module.exports = mongoose.model('Role', roleSchema);
