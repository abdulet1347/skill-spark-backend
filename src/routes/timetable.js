const router = require('express').Router();
const Timetable = require('../models/Timetable');
const { auth, requireStudent } = require('../middleware/auth');

const MIN_HOUR = 18; // 6 PM
const MAX_HOUR = 21; // 9 PM

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const isValidSlotTime = (time) => {
  const mins = timeToMinutes(time);
  return mins >= MIN_HOUR * 60 && mins <= MAX_HOUR * 60;
};

// ── Get timetable ─────────────────────────────────────────────────────────────
router.get('/:studentId', auth, async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ student_id: req.params.studentId });
    res.json(timetable || { slots: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save / replace timetable ──────────────────────────────────────────────────
router.post('/', auth, requireStudent, async (req, res) => {
  try {
    const { student_id, slots } = req.body;
    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ error: 'slots array is required' });
    }

    // Enforce 6 PM – 9 PM rule on every slot
    const invalid = slots.filter(
      s => !isValidSlotTime(s.startTime) || !isValidSlotTime(s.endTime)
    );
    if (invalid.length > 0) {
      return res.status(400).json({
        error: 'All study slots must be between 6:00 PM and 9:00 PM only.',
        invalid_slots: invalid,
      });
    }

    const timetable = await Timetable.findOneAndUpdate(
      { student_id: student_id || req.user._id },
      { student_id: student_id || req.user._id, slots, week_start: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ timetable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add single slot ───────────────────────────────────────────────────────────
router.post('/slot', auth, requireStudent, async (req, res) => {
  try {
    const { student_id, slot } = req.body;
    if (!slot) return res.status(400).json({ error: 'slot is required' });

    if (!isValidSlotTime(slot.startTime) || !isValidSlotTime(slot.endTime)) {
      return res.status(400).json({
        error: 'Study slots must be between 6:00 PM and 9:00 PM only.',
      });
    }

    const timetable = await Timetable.findOneAndUpdate(
      { student_id: student_id || req.user._id },
      { $push: { slots: slot } },
      { upsert: true, new: true }
    );

    res.json({ timetable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete single slot ────────────────────────────────────────────────────────
router.delete('/slot/:studentId/:slotId', auth, requireStudent, async (req, res) => {
  try {
    const timetable = await Timetable.findOneAndUpdate(
      { student_id: req.params.studentId },
      { $pull: { slots: { _id: req.params.slotId } } },
      { new: true }
    );
    res.json({ timetable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
