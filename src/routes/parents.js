const router = require('express').Router();
const { body } = require('express-validator');
const Parent = require('../models/Parent');
const Student = require('../models/Student');
const { auth, requireParent } = require('../middleware/auth');
const { signToken } = require('../utils/jwt');
const validate = require('../middleware/validate');

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('pin').matches(/^\d{4,6}$/).withMessage('PIN must be 4–6 digits'),
], validate, async (req, res) => {
  try {
    const { name, email, pin } = req.body;

    const exists = await Parent.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const parent = await Parent.create({ name, email, pin_hash: pin });
    const token = signToken(parent._id, 'parent');

    res.status(201).json({ token, parent });
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

    const parent = await Parent.findOne({ email }).select('+pin_hash');
    if (!parent) return res.status(401).json({ error: 'Invalid email or PIN' });

    const valid = await parent.verifyPin(pin);
    if (!valid) return res.status(401).json({ error: 'Invalid email or PIN' });

    const token = signToken(parent._id, 'parent');
    res.json({ token, parent: parent.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Connect to student ────────────────────────────────────────────────────────
router.post('/:id/connect', auth, requireParent, async (req, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    const student = await Student.findById(student_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parent = await Parent.findById(req.params.id);
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    // Avoid duplicates
    const alreadyConnected = parent.connected_student_ids.some(
      id => id.toString() === student_id.toString()
    );
    if (alreadyConnected) {
      return res.status(409).json({ error: 'Already connected to this student' });
    }

    parent.connected_student_ids.push(student_id);
    await parent.save();

    res.json({ parent, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get connected students ────────────────────────────────────────────────────
router.get('/:id/students', auth, requireParent, async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id).populate('connected_student_ids');
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    res.json({ students: parent.connected_student_ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update parent ─────────────────────────────────────────────────────────────
router.put('/:id', auth, requireParent, async (req, res) => {
  try {
    const { name } = req.body;
    const parent = await Parent.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!parent) return res.status(404).json({ error: 'Parent not found' });
    res.json({ parent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
