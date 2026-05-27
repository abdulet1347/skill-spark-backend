const router = require('express').Router();
const { auth } = require('../middleware/auth');
const claude = require('../services/claudeService');

// All AI routes require authentication
router.use(auth);

// ── Flashcards ────────────────────────────────────────────────────────────────
router.post('/flashcards', async (req, res) => {
  try {
    const { subject, content, difficulty = 'medium' } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required' });

    const result = await claude.generateFlashcards(subject, content || subject, difficulty);
    res.json(result);
  } catch (err) {
    console.error('AI flashcards error:', err.message);
    res.status(500).json({ error: 'Failed to generate flashcards', details: err.message });
  }
});

// ── Quiz ──────────────────────────────────────────────────────────────────────
router.post('/quiz', async (req, res) => {
  try {
    const { subject, topic, numQuestions = 5 } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required' });

    const result = await claude.generateQuiz(subject, topic || subject, Math.min(numQuestions, 15));
    res.json(result);
  } catch (err) {
    console.error('AI quiz error:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz', details: err.message });
  }
});

// ── Revision Summary ──────────────────────────────────────────────────────────
router.post('/summary', async (req, res) => {
  try {
    const { subject, content } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required' });

    const result = await claude.generateRevisionSummary(subject, content || subject);
    res.json(result);
  } catch (err) {
    console.error('AI summary error:', err.message);
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

// ── LSRW Content ──────────────────────────────────────────────────────────────
router.post('/lsrw', async (req, res) => {
  try {
    const { skill, level = 'intermediate' } = req.body;
    const validSkills = ['listening', 'speaking', 'reading', 'writing'];
    if (!validSkills.includes(skill)) {
      return res.status(400).json({ error: 'skill must be one of: listening, speaking, reading, writing' });
    }

    const result = await claude.generateLSRWContent(skill, level);
    res.json(result);
  } catch (err) {
    console.error('AI LSRW error:', err.message);
    res.status(500).json({ error: 'Failed to generate LSRW content', details: err.message });
  }
});

// ── Writing Analysis ──────────────────────────────────────────────────────────
router.post('/analyze-writing', async (req, res) => {
  try {
    const { text, prompt } = req.body;
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'Text is too short to analyze' });
    }

    const result = await claude.analyzeWriting(text, prompt || 'General writing');
    res.json(result);
  } catch (err) {
    console.error('AI writing analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze writing', details: err.message });
  }
});

// ── Timetable ─────────────────────────────────────────────────────────────────
router.post('/timetable', async (req, res) => {
  try {
    const { subjects, preferences } = req.body;
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'subjects array is required' });
    }

    const result = await claude.generateStudyTimetable(subjects, preferences || {});
    res.json(result);
  } catch (err) {
    console.error('AI timetable error:', err.message);
    res.status(500).json({ error: 'Failed to generate timetable', details: err.message });
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { messages, studentContext } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Limit conversation history to last 20 messages to control token usage
    const trimmedMessages = messages.slice(-20);
    const result = await claude.chatWithAI(trimmedMessages, studentContext || {});
    res.json(result);
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'Failed to get AI response', details: err.message });
  }
});

// ── Fun Activity ──────────────────────────────────────────────────────────────
router.post('/fun-activity', async (req, res) => {
  try {
    const { activityType, subject, difficulty = 'medium' } = req.body;
    const result = await claude.generateFunActivity(activityType, subject || 'General', difficulty);
    res.json(result);
  } catch (err) {
    console.error('AI fun activity error:', err.message);
    res.status(500).json({ error: 'Failed to generate activity', details: err.message });
  }
});

module.exports = router;
