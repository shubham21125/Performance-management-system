const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { getNextSequence } = require('../models/Counter');

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD;

async function seedAdmin() {
  if (!MONGO_URI) {
    console.error('FATAL: MONGO_URI is missing from environment.');
    process.exit(1);
  }

  if (!ADMIN_PASSWORD) {
    console.error('FATAL: ADMIN_SEED_PASSWORD or ADMIN_PASSWORD must be defined in .env before seeding admin.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, { dbName: 'employee_management' });
    console.log('Connected to MongoDB employee_management');

    const usersCol = mongoose.connection.db.collection('users');

    // Check if an Admin (role_id: 1) already exists
    const existingAdmin = await usersCol.findOne({ role_id: 1 });
    if (existingAdmin) {
      console.log(`Admin account already exists with username: '${existingAdmin.username}' (employee_id: ${existingAdmin.employee_id})`);
      await mongoose.disconnect();
      return;
    }

    // Also check if username is taken
    const seedUsername = process.env.ADMIN_SEED_USERNAME || 'superadmin';
    const existingUsername = await usersCol.findOne({ username: seedUsername });
    if (existingUsername) {
      console.log(`Username '${seedUsername}' already exists (employee_id: ${existingUsername.employee_id}, role: ${existingUsername.role_id})`);
      await mongoose.disconnect();
      return;
    }

    // Determine the next employee_id sequence
    const highestUser = await usersCol.find({}).sort({ employee_id: -1 }).limit(1).toArray();
    const maxId = highestUser.length > 0 ? (highestUser[0].employee_id || 0) : 0;
    
    // Increment counter
    let nextId = await getNextSequence('employee_id');
    if (nextId <= maxId) {
      const counterCol = mongoose.connection.db.collection('counters');
      await counterCol.updateOne({ _id: 'employee_id' }, { $set: { seq: maxId + 1 } }, { upsert: true });
      nextId = maxId + 1;
    }

    const newAdmin = {
      employee_id: nextId,
      first_name: process.env.ADMIN_SEED_FIRST_NAME || 'Super',
      last_name: process.env.ADMIN_SEED_LAST_NAME || 'Admin',
      username: seedUsername,
      password: ADMIN_PASSWORD,
      email: process.env.ADMIN_SEED_EMAIL || 'admin@example.com',
      mobile: process.env.ADMIN_SEED_MOBILE || '9876543210',
      dept_id: 4, // IT Department
      role_id: 1, // Admin
      reporting_manager_id: null,
      date_of_joining: new Date('2026-01-01'),
      status: 'Active',
      created_at: new Date(),
      updated_at: new Date(),
      __v: 0,
    };

    await usersCol.insertOne(newAdmin);

    console.log('Successfully created new Admin user:');
    console.log(`  employee_id: ${newAdmin.employee_id}`);
    console.log(`  username:    ${newAdmin.username}`);
    console.log(`  role_id:     ${newAdmin.role_id} (Admin)`);
    console.log(`  status:      ${newAdmin.status}`);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Seed Admin error:', err);
    process.exit(1);
  }
}

seedAdmin();
