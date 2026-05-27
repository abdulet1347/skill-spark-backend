const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  front:      { type: String, required: true },
  back:       { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  known:      { type: Boolean, default: false },
  review_count: { type: Number, default: 0 },
}, { _id: true });

const flashcardSetSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  subject:  { type: String, required: true },
  topic:    { type: String, default: '' },
  cards:    [cardSchema],
  difficulty_stats: {
    easy:   { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard:   { type: Number, default: 0 },
  },
  source:   { type: String, enum: ['ai', 'upload', 'manual'], default: 'ai' },
}, { timestamps: true });

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);
