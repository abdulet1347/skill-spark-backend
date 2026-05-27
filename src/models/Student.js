const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name too long'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
  },
  pin_hash: {
    type: String,
    required: true,
    select: false,
  },

  // Academic profile
  board: {
    type: String,
    enum: ['CBSE', 'ICSE', 'State Board', 'Matriculation', 'Other', ''],
    default: '',
  },
  grade: {
    type: String,
    enum: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', ''],
    default: '',
  },
  subjects: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 6,
      message: 'Maximum 6 subjects allowed',
    },
  },

  // Gamification
  xp_points:    { type: Number, default: 0, min: 0 },
  streak_count: { type: Number, default: 0, min: 0 },
  last_study_date: { type: Date, default: null },
  level:        { type: Number, default: 1, min: 1 },
  badges:       { type: [String], default: [] },
  coins:        { type: Number, default: 0, min: 0 },

  // Connection
  connection_code: {
    type: String,
    unique: true,
    default: () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const part1 = Array.from({ length: 2 }, () => 'SK').join('') + chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
      const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `${part1}-${part2}`;
    },
  },

  onboarding_complete: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.pin_hash;
      delete ret.__v;
      return ret;
    },
  },
});

// Hash PIN before save
studentSchema.pre('save', async function (next) {
  if (!this.isModified('pin_hash')) return next();
  // pin_hash field actually stores the raw PIN temporarily; we hash it here
  this.pin_hash = await bcrypt.hash(this.pin_hash, 12);
  next();
});

// Verify PIN
studentSchema.methods.verifyPin = async function (pin) {
  return bcrypt.compare(String(pin), this.pin_hash);
};

// Auto-level based on XP
studentSchema.methods.recalculateLevel = function () {
  this.level = Math.floor(this.xp_points / 100) + 1;
};

// Add XP and check badges
studentSchema.methods.addXP = async function (amount, source) {
  this.xp_points += amount;
  this.recalculateLevel();

  // Badge checks
  const newBadges = [];
  if (this.streak_count >= 7 && !this.badges.includes('7-Day Streak')) {
    this.badges.push('7-Day Streak'); newBadges.push('7-Day Streak');
  }
  if (this.xp_points >= 500 && !this.badges.includes('Focus Champion')) {
    this.badges.push('Focus Champion'); newBadges.push('Focus Champion');
  }

  await this.save();
  return newBadges;
};

// Update streak
studentSchema.methods.updateStreak = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.last_study_date) {
    this.streak_count = 1;
  } else {
    const last = new Date(this.last_study_date);
    last.setHours(0, 0, 0, 0);
    const diff = (today - last) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      this.streak_count += 1;
    } else if (diff > 1) {
      this.streak_count = 1;
    }
    // diff === 0 means already studied today, no change
  }

  this.last_study_date = today;
  await this.save();
};

module.exports = mongoose.model('Student', studentSchema);
