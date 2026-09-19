const mongoose = require('mongoose');

// Shared counter schema for auto-incrementing IDs across modules
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema, 'counters');

/**
 * Atomically increments a named counter and returns the next sequence value.
 * @param {string} name - The counter identifier (e.g. 'review_id', 'employee_id')
 * @returns {Promise<number>} The next sequence integer
 */
async function getNextSequence(name) {
  const result = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

module.exports = { Counter, getNextSequence };
