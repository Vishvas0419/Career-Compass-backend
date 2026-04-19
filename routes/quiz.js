const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all quiz questions
router.get('/questions', async (req, res) => {
  try {
    const [questions] = await db.execute('SELECT * FROM quizzes ORDER BY id');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get quiz question by ID
router.get('/questions/:id', async (req, res) => {
  try {
    const [questions] = await db.execute('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(questions[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz question (Admin only)
router.post('/questions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { question, options, category, question_type } = req.body;

    if (!question || !options) {
      return res.status(400).json({ message: 'Question and options are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO quizzes (question, options, category, question_type) VALUES (?, ?, ?, ?)',
      [question, JSON.stringify(options), category || null, question_type || 'interest']
    );

    res.status(201).json({ message: 'Question created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update quiz question (Admin only)
router.put('/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { question, options, category, question_type } = req.body;

    const [result] = await db.execute(
      'UPDATE quizzes SET question = ?, options = ?, category = ?, question_type = ? WHERE id = ?',
      [question, JSON.stringify(options), category, question_type, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete quiz question (Admin only)
router.delete('/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM quizzes WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit quiz results
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    // Calculate score and recommend careers (simplified algorithm)
    const score = calculateQuizScore(answers);
    const suggestedCareers = await recommendCareers(score);

    // Save quiz results
    const [result] = await db.execute(
      'INSERT INTO quiz_results (user_id, answers, score, suggested_careers) VALUES (?, ?, ?, ?)',
      [req.user.id, JSON.stringify(answers), JSON.stringify(score), JSON.stringify(suggestedCareers)]
    );

    res.json({
      message: 'Quiz submitted successfully',
      result: {
        id: result.insertId,
        score,
        suggested_careers: suggestedCareers
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user quiz results
router.get('/results', authMiddleware, async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT * FROM quiz_results WHERE user_id = ? ORDER BY taken_at DESC',
      [req.user.id]
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific quiz result
router.get('/results/:id', authMiddleware, async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT * FROM quiz_results WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'Quiz result not found' });
    }

    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to calculate quiz score
function calculateQuizScore(answers) {
  const categories = {
    engineering: 0,
    medical: 0,
    commerce: 0,
    arts: 0,
    science: 0
  };

  // Simple scoring algorithm based on answer patterns
  answers.forEach((answer, index) => {
    if (typeof answer === 'string') {
      const lowerAnswer = answer.toLowerCase();
      
      if (lowerAnswer.includes('math') || lowerAnswer.includes('physics') || lowerAnswer.includes('engineering') || lowerAnswer.includes('technology') || lowerAnswer.includes('coding')) {
        categories.engineering += 2;
      }
      if (lowerAnswer.includes('biology') || lowerAnswer.includes('chemistry') || lowerAnswer.includes('medical') || lowerAnswer.includes('doctor') || lowerAnswer.includes('health')) {
        categories.medical += 2;
      }
      if (lowerAnswer.includes('commerce') || lowerAnswer.includes('business') || lowerAnswer.includes('accounting') || lowerAnswer.includes('finance') || lowerAnswer.includes('economics')) {
        categories.commerce += 2;
      }
      if (lowerAnswer.includes('arts') || lowerAnswer.includes('creative') || lowerAnswer.includes('design') || lowerAnswer.includes('literature') || lowerAnswer.includes('music')) {
        categories.arts += 2;
      }
      if (lowerAnswer.includes('science') || lowerAnswer.includes('research') || lowerAnswer.includes('analysis') || lowerAnswer.includes('data')) {
        categories.science += 1;
      }
    }
  });

  return categories;
}

// Helper function to recommend careers based on score
async function recommendCareers(score) {
  const categories = Object.keys(score);
  const maxCategory = categories.reduce((a, b) => score[a] > score[b] ? a : b);
  
  const categoryMap = {
    engineering: 'Engineering',
    medical: 'Medical',
    commerce: 'Commerce',
    arts: 'Arts',
    science: 'Science'
  };

  const [careers] = await db.execute(
    'SELECT * FROM careers WHERE category = ? LIMIT 5',
    [categoryMap[maxCategory] || 'Other']
  );

  return careers.map(c => ({ id: c.id, name: c.name, description: c.description }));
}

module.exports = router;

