const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const PerformanceReview = require('../models/PerformanceReview');
const { getNextSequence } = require('../models/Counter');

const MONGO_URI = process.env.MONGO_URI;

const sampleReviews = [
  {
    review_title: 'Q1 Performance & Systems Delivery',
    review_date: new Date('2026-03-15'),
    employee_id: 3, // Shreyas Mane (Accounts)
    reviewed_by: 1, // Manager (shubham suryavanshi)
    review_period: 'Quarterly',
    rating: 8,
    comments: 'Consistently demonstrates strong attention to detail in ledger reconciliations and automated reporting workflows.',
  },
  {
    review_title: 'Annual Leadership & Sales Execution',
    review_date: new Date('2026-06-20'),
    employee_id: 2, // kalash yadav (Sales - Team Leader)
    reviewed_by: 1, // Manager
    review_period: 'Annual',
    rating: 9,
    comments: 'Exceptional team leadership and client acquisition figures this past year. Exceeded target benchmarks across all quarters.',
  },
  {
    review_title: 'Monthly Sprint Review - Infrastructure',
    review_date: new Date('2026-08-10'),
    employee_id: 3, // Shreyas Mane
    reviewed_by: 1, // Manager
    review_period: 'Monthly',
    rating: 7,
    comments: 'Good effort in sprint tasks. Suggested attending specialized technical writing sessions to improve documentation clarity.',
  },
  {
    review_title: 'Quarterly Operations & Process Efficiency',
    review_date: new Date('2026-07-28'),
    employee_id: 5, // Rohit Sharma (Operation)
    reviewed_by: 2, // kalash yadav (Team Leader)
    review_period: 'Quarterly',
    rating: 9,
    comments: 'Demonstrated stellar process streamlining, resulting in a 15% reduction in ticket turnaround latency.',
  },
  {
    review_title: 'Monthly Operations Onboarding Assessment',
    review_date: new Date('2026-05-12'),
    employee_id: 5, // Rohit Sharma
    reviewed_by: 2, // kalash yadav
    review_period: 'Monthly',
    rating: 5,
    comments: 'Needs to enhance adherence to operating procedures. Recommended pairing with a senior associate on complex assignments.',
  },
  {
    review_title: 'Annual Department Review - Engineering',
    review_date: new Date('2026-09-01'),
    employee_id: 1, // shubham suryavanshi (IT)
    reviewed_by: 6, // Super Admin
    review_period: 'Annual',
    rating: 10,
    comments: 'Outstanding leadership of technical projects, cross-module architecture, and team mentorship throughout the year.',
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, { dbName: 'employee_management' });
  console.log('Connected to MongoDB for review seeding');

  const count = await PerformanceReview.countDocuments();
  if (count > 0) {
    console.log(`Reviews collection already contains ${count} records. Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  for (const item of sampleReviews) {
    const review_id = await getNextSequence('review_id');
    const doc = new PerformanceReview({
      ...item,
      review_id,
    });
    await doc.save();
    console.log(`Created review #${review_id}: "${item.review_title}" for employee ${item.employee_id}`);
  }

  console.log('Finished seeding sample performance reviews!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Error seeding reviews:', err);
  process.exit(1);
});
