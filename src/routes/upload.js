const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudyMaterial = require('../models/StudyMaterial');
const { auth, requireStudent } = require('../middleware/auth');
const claude = require('../services/claudeService');

// ── Multer config ─────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, PNG, JPG, TXT files are allowed'));
    }
  },
});

// ── Upload + AI process ───────────────────────────────────────────────────────
router.post('/', auth, requireStudent, upload.array('files', 5), async (req, res) => {
  try {
    const { subject, text_content, student_id } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });

    // Build content string from uploaded text files + pasted text
    let content = text_content || '';
    const fileUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileUrl = `/uploads/${file.filename}`;
        fileUrls.push(fileUrl);

        // Read text files directly
        if (file.mimetype === 'text/plain') {
          const text = fs.readFileSync(file.path, 'utf8');
          content += '\n' + text;
        } else {
          // For PDF/DOCX/images, use filename as context hint
          content += `\n[Uploaded file: ${file.originalname}]`;
        }
      }
    }

    if (!content.trim()) {
      content = `Study material for ${subject}`;
    }

    // Run AI processing in parallel
    const [summary, flashcards, quiz] = await Promise.all([
      claude.generateRevisionSummary(subject, content),
      claude.generateFlashcards(subject, content, 'medium'),
      claude.generateQuiz(subject, subject, 5),
    ]);

    // Save to DB
    const material = await StudyMaterial.create({
      student_id: student_id || req.user._id,
      subject,
      original_name: req.files?.[0]?.originalname || 'pasted-text',
      file_url: fileUrls[0] || '',
      file_type: req.files?.[0]?.mimetype || 'text/plain',
      content_text: content.slice(0, 5000),
      ai_summary: summary.summary || '',
      revision_notes: summary.revisionNotes || '',
      key_points: summary.keyPoints || [],
      processed: true,
    });

    res.status(201).json({ material, summary, flashcards, quiz });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get materials for student ─────────────────────────────────────────────────
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ student_id: req.params.studentId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ materials });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = router;
