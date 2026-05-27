const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  subject:        { type: String, required: true },
  original_name:  { type: String, default: '' },
  file_url:       { type: String, default: '' },
  file_type:      { type: String, default: '' },
  content_text:   { type: String, default: '' }, // extracted/pasted text
  ai_summary:     { type: String, default: '' },
  revision_notes: { type: String, default: '' },
  key_points:     { type: [String], default: [] },
  processed:      { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
