const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  day:       { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], required: true },
  subject:   { type: String, required: true },
  startTime: { type: String, required: true }, // "18:00"
  endTime:   { type: String, required: true }, // "19:00"
  color:     { type: String, default: '#1A73E8' },
}, { _id: true });

const timetableSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
  },
  slots:      [slotSchema],
  week_start: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
