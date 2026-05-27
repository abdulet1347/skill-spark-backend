const Anthropic = require('@anthropic-ai/sdk');

let client = null;

const getClient = () => {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
};

const MODEL = 'claude-3-5-haiku-20241022'; // fast + cheap for educational use

// ── Core call ─────────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  const claude = getClient();
  const message = await claude.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return message.content[0].text;
}

// Parse JSON safely from Claude response
function parseJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ── SYSTEM PROMPT BASE ────────────────────────────────────────────────────────
const BASE_SYSTEM = `You are Sparky, a friendly AI tutor for Indian school students (Grades 6-10).
Rules:
- Always be encouraging, positive, and child-safe
- Never use words like "wrong", "failed", "bad", "poor"
- Instead say "Good try! Let's solve it together" or "Great attempt!"
- Keep language simple and age-appropriate
- Responses must be in valid JSON format as specified
- Focus on Indian curriculum (CBSE/ICSE/State Board)`;

// ── FLASHCARDS ────────────────────────────────────────────────────────────────
async function generateFlashcards(subject, content, difficulty = 'medium') {
  const system = `${BASE_SYSTEM}
Generate exactly 8 flashcards as JSON. Each card has: front (question), back (answer), difficulty (easy/medium/hard).
Return ONLY this JSON structure:
{"cards": [{"id": 1, "front": "...", "back": "...", "difficulty": "medium"}, ...]}`;

  const user = `Subject: ${subject}
Content/Topic: ${content}
Target difficulty: ${difficulty}
Generate 8 educational flashcards suitable for Indian school students.`;

  const text = await callClaude(system, user, 1500);
  return parseJSON(text);
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────
async function generateQuiz(subject, topic, numQuestions = 5) {
  const system = `${BASE_SYSTEM}
Generate multiple-choice quiz questions as JSON.
Return ONLY this JSON structure:
{"questions": [{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}, ...]}
- correct is the 0-based index of the correct option
- explanation should be encouraging and educational`;

  const user = `Subject: ${subject}
Topic: ${topic}
Number of questions: ${numQuestions}
Generate ${numQuestions} MCQ questions for Indian school students (Grades 6-10).`;

  const text = await callClaude(system, user, 2000);
  return parseJSON(text);
}

// ── REVISION SUMMARY ──────────────────────────────────────────────────────────
async function generateRevisionSummary(subject, content) {
  const system = `${BASE_SYSTEM}
Generate a revision summary as JSON.
Return ONLY this JSON structure:
{"summary": "...", "keyPoints": ["point1", "point2", ...], "revisionNotes": "..."}
- summary: 2-3 paragraph overview
- keyPoints: 4-6 bullet points
- revisionNotes: study tips and memory tricks`;

  const user = `Subject: ${subject}
Content: ${content.slice(0, 3000)}
Generate a comprehensive revision summary for Indian school students.`;

  const text = await callClaude(system, user, 1500);
  return parseJSON(text);
}

// ── LSRW CONTENT ─────────────────────────────────────────────────────────────
async function generateLSRWContent(skill, level = 'intermediate') {
  const prompts = {
    listening: `Generate a listening comprehension exercise as JSON:
{"passage": "...(100-150 words)...", "questions": [{"q": "...", "options": ["A","B","C","D"], "correct": 0}, ...]}
Include 3 comprehension questions. Passage should be about an interesting topic for Indian students.`,

    speaking: `Generate a speaking exercise as JSON:
{"topic": "...", "tips": ["tip1", "tip2", "tip3", "tip4"], "criteria": ["Grammar", "Vocabulary", "Fluency", "Pronunciation"]}
Topic should be relatable for Indian school students.`,

    reading: `Generate a reading comprehension exercise as JSON:
{"passage": "...(150-200 words)...", "questions": [{"q": "...", "options": ["A","B","C","D"], "correct": 0}, ...]}
Include 4 comprehension questions covering skimming, scanning, and inference.`,

    writing: `Generate a writing exercise as JSON:
{"prompt": "...", "wordLimit": 150, "tips": ["tip1", "tip2", "tip3", "tip4"], "type": "essay/letter/paragraph"}
Prompt should be appropriate for Indian school students.`,
  };

  const system = `${BASE_SYSTEM}
You are generating English language learning content (LSRW) for Indian school students.
Return ONLY valid JSON as specified. Content must be educational and child-safe.`;

  const text = await callClaude(system, prompts[skill] || prompts.reading, 1200);
  return parseJSON(text);
}

// ── WRITING ANALYSIS ──────────────────────────────────────────────────────────
async function analyzeWriting(text, prompt) {
  const system = `${BASE_SYSTEM}
Analyze student writing and provide encouraging feedback as JSON.
Return ONLY this JSON structure:
{"score": 75, "feedback": "...", "suggestions": ["...", "..."], "strengths": ["...", "..."], "encouragement": "..."}
- score: 0-100
- Never be discouraging. Always find positives first.
- suggestions: 3-4 specific, actionable improvements
- strengths: 2-3 things done well
- encouragement: one motivating sentence`;

  const user = `Writing prompt: ${prompt}
Student's response: ${text}
Analyze this writing from an Indian school student and provide constructive, encouraging feedback.`;

  const response = await callClaude(system, user, 1000);
  return parseJSON(response);
}

// ── TIMETABLE ─────────────────────────────────────────────────────────────────
async function generateStudyTimetable(subjects, preferences = {}) {
  const system = `${BASE_SYSTEM}
Generate a weekly study timetable as JSON.
STRICT RULE: All slots must be between 18:00 (6 PM) and 21:00 (9 PM) only.
Return ONLY this JSON structure:
{"slots": [{"day": "Monday", "subject": "...", "startTime": "18:00", "endTime": "19:00", "color": "#1A73E8"}, ...]}
Colors: Mathematics=#1A73E8, Science=#34A853, English=#7C3AED, Social Science=#FBBC04, Computer Science=#EA4335, default=#00BCD4`;

  const user = `Subjects: ${subjects.join(', ')}
Generate a balanced weekly timetable. Distribute subjects across weekdays.
Each session should be 30-60 minutes. All times must be between 6:00 PM and 9:00 PM.`;

  const text = await callClaude(system, user, 1200);
  return parseJSON(text);
}

// ── AI CHAT ───────────────────────────────────────────────────────────────────
async function chatWithAI(messages, studentContext = {}) {
  const claude = getClient();

  const system = `${BASE_SYSTEM}
You are Sparky, a personal AI tutor for ${studentContext.name || 'a student'} in ${studentContext.grade || 'school'} (${studentContext.board || 'CBSE'}).
Their subjects: ${(studentContext.subjects || []).join(', ') || 'general subjects'}.

Guidelines:
- Give clear, step-by-step explanations
- Use examples relevant to Indian students
- Keep responses concise (2-4 paragraphs max)
- Use emojis sparingly to keep it friendly
- If asked something inappropriate, gently redirect to studies
- Never provide answers to exam papers or help with cheating`;

  const formattedMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    messages: formattedMessages,
  });

  return { reply: response.content[0].text };
}

// ── FUN ACTIVITY ──────────────────────────────────────────────────────────────
async function generateFunActivity(activityType, subject, difficulty = 'medium') {
  const system = `${BASE_SYSTEM}
Generate a fun educational activity as JSON for Indian school students.`;

  const user = `Activity type: ${activityType}
Subject: ${subject}
Difficulty: ${difficulty}
Generate engaging content for this activity.`;

  const text = await callClaude(system, user, 800);
  try {
    return parseJSON(text);
  } catch {
    return { type: activityType, content: text };
  }
}

module.exports = {
  generateFlashcards,
  generateQuiz,
  generateRevisionSummary,
  generateLSRWContent,
  analyzeWriting,
  generateStudyTimetable,
  chatWithAI,
  generateFunActivity,
};
