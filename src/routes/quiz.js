const router = require('express').Router();
const QuizAttempt = require('../models/QuizAttempt');
const Student = require('../models/Student');
const { auth, requireStudent } = require('../middleware/auth');

// ── Save quiz attempt ─────────────────────────────────────────────────────────
router.post('/attempt', auth, requireStudent, async (req, res) => {
  try {
    const { student_id, subject, topic, score, total, questions, answers } = req.body;

    if (score === undefined || !total) {
      return res.status(400).json({ error: 'score and total are required' });
    }

    const xpEarned = score * 10;

    const attempt = await QuizAttempt.create({
      student_id: student_id || req.user._id,
      subject: subject || 'General',
      topic: topic || '',
      score,
      total,
      xp_earned: xpEarned,
      questions: questions || [],
      answers: answers || [],
    });

    // Award XP
    const student = await Student.findById(student_id || req.user._id);
    const newBadges = [];
    if (student) {
      const badges = await student.addXP(xpEarned, 'quiz');

      // Badge: Quiz Master for 100%
      if (score === total && !student.badges.includes('Quiz Master')) {
        student.badges.push('Quiz Master');
        await student.save();
        newBadges.push('Quiz Master');
      }
      // Badge: Perfect Score
      if (score === total && !student.badges.includes('Perfect Score')) {
        student.badges.push('Perfect Score');
        await student.save();
        newBadges.push('Perfect Score');
      }

      newBadges.push(...badges);
    }

    res.status(201).json({ attempt, xp_earned: xpEarned, new_badges: newBadges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get quiz history ──────────────────────────────────────────────────────────
router.get('/history/:studentId', auth, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ student_id: req.params.studentId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ attempts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
