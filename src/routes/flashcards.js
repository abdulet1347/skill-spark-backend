const router = require('express').Router();
const FlashcardSet = require('../models/FlashcardSet');
const Student = require('../models/Student');
const { auth, requireStudent } = require('../middleware/auth');

// ── Save flashcard set ────────────────────────────────────────────────────────
router.post('/', auth, requireStudent, async (req, res) => {
  try {
    const { student_id, subject, topic, cards, source } = req.body;

    if (!subject || !cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'subject and cards array are required' });
    }

    // Calculate difficulty stats
    const stats = { easy: 0, medium: 0, hard: 0 };
    cards.forEach(c => { if (stats[c.difficulty] !== undefined) stats[c.difficulty]++; });

    const set = await FlashcardSet.create({
      student_id: student_id || req.user._id,
      subject,
      topic: topic || '',
      cards,
      difficulty_stats: stats,
      source: source || 'ai',
    });

    res.status(201).json({ set });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get sets for student ──────────────────────────────────────────────────────
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const sets = await FlashcardSet.find({ student_id: req.params.studentId })
      .sort({ createdAt: -1 });
    res.json({ sets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update card known status + award XP ──────────────────────────────────────
router.patch('/:setId/card/:cardId', auth, requireStudent, async (req, res) => {
  try {
    const { known } = req.body;
    const set = await FlashcardSet.findById(req.params.setId);
    if (!set) return res.status(404).json({ error: 'Flashcard set not found' });

    const card = set.cards.id(req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    card.known = known;
    card.review_count += 1;
    await set.save();

    // Award XP for marking known
    let xpEarned = 0;
    if (known) {
      xpEarned = 5;
      const student = await Student.findById(req.user._id);
      if (student) {
        await student.addXP(5, 'flashcard');

        // Badge: Flashcard Genius after 50 known cards
        const knownCount = await FlashcardSet.aggregate([
          { $match: { student_id: student._id } },
          { $unwind: '$cards' },
          { $match: { 'cards.known': true } },
          { $count: 'total' },
        ]);
        const total = knownCount[0]?.total || 0;
        if (total >= 50 && !student.badges.includes('Flashcard Genius')) {
          student.badges.push('Flashcard Genius');
          await student.save();
        }
      }
    }

    res.json({ card, xp_earned: xpEarned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
