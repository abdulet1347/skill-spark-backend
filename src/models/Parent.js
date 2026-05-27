const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentSchema = new mongoose.Schema({
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
  connected_student_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  }],
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

parentSchema.pre('save', async function (next) {
  if (!this.isModified('pin_hash')) return next();
  this.pin_hash = await bcrypt.hash(this.pin_hash, 12);
  next();
});

parentSchema.methods.verifyPin = async function (pin) {
  return bcrypt.compare(String(pin), this.pin_hash);
};

module.exports = mongoose.model('Parent', parentSchema);
