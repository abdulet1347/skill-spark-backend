const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  subject:    { type: String, required: true },
  topic:      { type: String, default: '' },
  score:      { type: Number, required: true },
  total:      { type: Number, required: true },
  percentage: { type: Number },
  xp_earned:  { type: Number, default: 0 },
  questions:  { type: Array, default: [] },
  answers:    { type: Array, default: [] },
}, { timestamps: true });

quizAttemptSchema.pre('save', function (next) {
  this.percentage = Math.round((this.score / this.total) * 100);
  next();
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
