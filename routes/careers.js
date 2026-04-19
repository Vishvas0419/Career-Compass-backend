const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all careers
router.get('/', async (req, res) => {
  try {
    const [careers] = await db.execute('SELECT * FROM careers ORDER BY name');
    res.json(careers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get career by ID
router.get('/:id', async (req, res) => {
  try {
    const [careers] = await db.execute('SELECT * FROM careers WHERE id = ?', [req.params.id]);
    
    if (careers.length === 0) {
      return res.status(404).json({ message: 'Career not found' });
    }

    res.json(careers[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create career (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, skills, eligibility, salary_range, growth_outlook, category } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO careers (name, description, skills, eligibility, salary_range, growth_outlook, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, skills || null, eligibility || null, salary_range || null, growth_outlook || null, category || 'Other']
    );

    res.status(201).json({ message: 'Career created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update career (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, skills, eligibility, salary_range, growth_outlook, category } = req.body;

    const [result] = await db.execute(
      'UPDATE careers SET name = ?, description = ?, skills = ?, eligibility = ?, salary_range = ?, growth_outlook = ?, category = ? WHERE id = ?',
      [name, description, skills, eligibility, salary_range, growth_outlook, category, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Career not found' });
    }

    res.json({ message: 'Career updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete career (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM careers WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Career not found' });
    }

    res.json({ message: 'Career deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save career (User)
router.post('/:id/save', authMiddleware, async (req, res) => {
  try {
    await db.execute(
      'INSERT IGNORE INTO saved_careers (user_id, career_id) VALUES (?, ?)',
      [req.user.id, req.params.id]
    );

    res.json({ message: 'Career saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get saved careers (User)
router.get('/saved/list', authMiddleware, async (req, res) => {
  try {
    const [careers] = await db.execute(
      'SELECT c.* FROM careers c INNER JOIN saved_careers sc ON c.id = sc.career_id WHERE sc.user_id = ?',
      [req.user.id]
    );

    res.json(careers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unsave career (User)
router.delete('/:id/save', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM saved_careers WHERE user_id = ? AND career_id = ?',
      [req.user.id, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Saved career not found' });
    }

    res.json({ message: 'Career unsaved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

