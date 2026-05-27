const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  subject:        { type: String, default: '' },
  duration_minutes: { type: Number, required: true, min: 1 },
  timer_type:     { type: String, enum: ['candle', 'ice'], default: 'candle' },
  notes:          { type: String, default: '' },
  xp_earned:      { type: Number, default: 20 },
  completed:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('StudySession', studySessionSchema);
