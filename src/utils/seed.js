/**
 * Seed script — creates demo student + parent accounts for testing
 * Run: node src/utils/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Parent = require('../models/Parent');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillspark');
  console.log('Connected to MongoDB');

  // Clear existing demo accounts
  await Student.deleteMany({ email: /demo@skillspark/ });
  await Parent.deleteMany({ email: /demo@skillspark/ });

  // Create demo student
  const student = await Student.create({
    name: 'Arjun Kumar',
    email: 'student@demo.skillspark',
    pin_hash: '1234',
    board: 'CBSE',
    grade: 'Grade 9',
    subjects: ['Mathematics', 'Science', 'English', 'Social Science'],
    xp_points: 350,
    streak_count: 5,
    level: 4,
    badges: ['7-Day Streak', 'Quiz Master'],
    onboarding_complete: true,
  });

  // Create demo parent
  const parent = await Parent.create({
    name: 'Priya Kumar',
    email: 'parent@demo.skillspark',
    pin_hash: '1234',
    connected_student_ids: [student._id],
  });

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Student login:');
  console.log('  Email : student@demo.skillspark');
  console.log('  PIN   : 1234');
  console.log('  Code  :', student.connection_code);
  console.log('\nParent login:');
  console.log('  Email : parent@demo.skillspark');
  console.log('  PIN   : 1234');
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
