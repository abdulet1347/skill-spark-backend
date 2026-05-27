const router = require('express').Router();
const StudySession = require('../models/StudySession');
const Student = require('../models/Student');
const { auth, requireStudent } = require('../middleware/auth');

// ── Create session ────────────────────────────────────────────────────────────
router.post('/', auth, requireStudent, async (req, res) => {
  try {
    const { student_id, duration_minutes, timer_type, subject, notes } = req.body;

    if (!duration_minutes || duration_minutes < 1) {
      return res.status(400).json({ error: 'duration_minutes must be at least 1' });
    }

    const session = await StudySession.create({
      student_id: student_id || req.user._id,
      duration_minutes,
      timer_type: timer_type || 'candle',
      subject: subject || '',
      notes: notes || '',
      xp_earned: 20,
    });

    // Award XP and update streak
    const student = await Student.findById(student_id || req.user._id);
    if (student) {
      await student.updateStreak();
      const newBadges = await student.addXP(20, 'study_session');

      // Badge: Focus Champion for 60+ min session
      if (duration_minutes >= 60 && !student.badges.includes('Focus Champion')) {
        student.badges.push('Focus Champion');
        await student.save();
        newBadges.push('Focus Champion');
      }

      return res.status(201).json({ session, xp_earned: 20, new_badges: newBadges, student });
    }

    res.status(201).json({ session, xp_earned: 20 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get sessions for student ──────────────────────────────────────────────────
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const sessions = await StudySession.find({ student_id: req.params.studentId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
