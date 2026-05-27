const router = require('express').Router();
const { body } = require('express-validator');
const Student = require('../models/Student');
const StudySession = require('../models/StudySession');
const QuizAttempt = require('../models/QuizAttempt');
const { auth, requireStudent } = require('../middleware/auth');
const { signToken } = require('../utils/jwt');
const validate = require('../middleware/validate');

const BLOCKED_SUBJECTS = ['tamil','telugu','kannada','malayalam','bengali','gujarati','punjabi','urdu','marathi','odia','assamese','hindi'];
const ALLOWED_SUBJECTS = ['English','Mathematics','Science','Social Science','Computer Science'];

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('pin').matches(/^\d{4,6}$/).withMessage('PIN must be 4–6 digits'),
], validate, async (req, res) => {
  try {
    const { name, email, pin } = req.body;

    const exists = await Student.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const student = await Student.create({ name, email, pin_hash: pin });
    const token = signToken(student._id, 'student');

    res.status(201).json({ token, student });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('pin').matches(/^\d{4,6}$/).withMessage('PIN must be 4–6 digits'),
], validate, async (req, res) => {
  try {
    const { email, pin } = req.body;

    const student = await Student.findOne({ email }).select('+pin_hash');
    if (!student) return res.status(401).json({ error: 'Invalid email or PIN' });

    const valid = await student.verifyPin(pin);
    if (!valid) return res.status(401).json({ error: 'Invalid email or PIN' });

    const token = signToken(student._id, 'student');
    // Return without pin_hash
    const studentObj = student.toJSON();
    res.json({ token, student: studentObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Onboarding ────────────────────────────────────────────────────────────────
router.put('/:id/onboarding', auth, requireStudent, async (req, res) => {
  try {
    const { board, grade, subjects } = req.body;

    // Validate subjects
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'At least one subject required' });
    }
    if (subjects.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 subjects allowed' });
    }

    // Check for blocked subjects
    for (const sub of subjects) {
      const lower = sub.toLowerCase().trim();
      if (BLOCKED_SUBJECTS.some(b => lower.includes(b))) {
        return res.status(400).json({ error: 'Regional language subjects are not allowed.' });
      }
      if (!/^[a-zA-Z\s]+$/.test(sub)) {
        return res.status(400).json({ error: 'Subject names must contain only English letters.' });
      }
      if (sub.length > 30) {
        return res.status(400).json({ error: 'Subject name must be under 30 characters.' });
      }
    }

    // Max 1 custom subject
    const customSubjects = subjects.filter(s => !ALLOWED_SUBJECTS.includes(s));
    if (customSubjects.length > 1) {
      return res.status(400).json({ error: 'Only one custom subject is allowed.' });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { board, grade, subjects, onboarding_complete: true },
      { new: true, runValidators: true }
    );

    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get dashboard data ────────────────────────────────────────────────────────
router.get('/:id/dashboard', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Recent study sessions
    const recentSessions = await StudySession.find({ student_id: req.params.id })
      .sort({ createdAt: -1 }).limit(5);

    // Recent quiz attempts
    const recentQuizzes = await QuizAttempt.find({ student_id: req.params.id })
      .sort({ createdAt: -1 }).limit(5);

    res.json({
      ...student.toJSON(),
      recent_sessions: recentSessions,
      recent_quizzes: recentQuizzes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get progress ──────────────────────────────────────────────────────────────
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Weekly XP (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await StudySession.find({
      student_id: req.params.id,
      createdAt: { $gte: sevenDaysAgo },
    });

    const quizzes = await QuizAttempt.find({
      student_id: req.params.id,
      createdAt: { $gte: sevenDaysAgo },
    });

    // Build daily XP array (Mon–Sun)
    const weeklyXP = Array(7).fill(0);
    sessions.forEach(s => {
      const day = new Date(s.createdAt).getDay();
      weeklyXP[day === 0 ? 6 : day - 1] += s.xp_earned || 20;
    });
    quizzes.forEach(q => {
      const day = new Date(q.createdAt).getDay();
      weeklyXP[day === 0 ? 6 : day - 1] += q.xp_earned || 0;
    });

    // Subject scores from quiz attempts
    const subjectMap = {};
    const allQuizzes = await QuizAttempt.find({ student_id: req.params.id });
    allQuizzes.forEach(q => {
      if (!subjectMap[q.subject]) subjectMap[q.subject] = { total: 0, count: 0 };
      subjectMap[q.subject].total += q.percentage || 0;
      subjectMap[q.subject].count += 1;
    });

    const COLORS = { Mathematics: '#1A73E8', Science: '#34A853', English: '#7C3AED', 'Social Science': '#FBBC04', 'Computer Science': '#EA4335' };
    const subjectScores = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      score: Math.round(data.total / data.count),
      trend: '+' + Math.floor(Math.random() * 15 + 3) + '%',
      color: COLORS[subject] || '#00BCD4',
    }));

    const avgScore = subjectScores.length
      ? Math.round(subjectScores.reduce((a, b) => a + b.score, 0) / subjectScores.length)
      : 0;

    const studyHours = sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60;

    const weakSubjects = subjectScores.filter(s => s.score < 70).map(s => s.subject);
    const strongSubjects = subjectScores.filter(s => s.score >= 80).map(s => s.subject);

    res.json({
      weeklyXP,
      subjectScores,
      studyHours: Math.round(studyHours * 10) / 10,
      quizAttempts: allQuizzes.length,
      avgScore,
      weakSubjects,
      strongSubjects,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update student ────────────────────────────────────────────────────────────
router.put('/:id', auth, requireStudent, async (req, res) => {
  try {
    const allowed = ['name', 'board', 'grade', 'subjects'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get by connection code ────────────────────────────────────────────────────
router.get('/by-code/:code', auth, async (req, res) => {
  try {
    const student = await Student.findOne({ connection_code: req.params.code.toUpperCase() });
    if (!student) return res.status(404).json({ error: 'No student found with this code' });
    res.json({ student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
