const mongoose = require('mongoose');

const funActivityProgressSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  activity_type: {
    type: String,
    enum: ['word', 'math', 'memory', 'daily', 'science', 'quiz_battle'],
    required: true,
  },
  high_score:   { type: Number, default: 0 },
  total_plays:  { type: Number, default: 0 },
  total_xp:     { type: Number, default: 0 },
  last_played:  { type: Date, default: Date.now },
}, { timestamps: true });

funActivityProgressSchema.index({ student_id: 1, activity_type: 1 }, { unique: true });

module.exports = mongoose.model('FunActivityProgress', funActivityProgressSchema);
