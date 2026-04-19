const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all resources
router.get('/', async (req, res) => {
  try {
    const { type, category } = req.query;
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const [resources] = await db.execute(query, params);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get resource by ID
router.get('/:id', async (req, res) => {
  try {
    const [resources] = await db.execute('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    
    if (resources.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json(resources[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create resource (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, type, url, category } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await db.execute(
      'INSERT INTO resources (title, description, type, url, category) VALUES (?, ?, ?, ?, ?)',
      [title, description || null, type || 'article', url || null, category || null]
    );

    res.status(201).json({ message: 'Resource created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update resource (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, type, url, category } = req.body;

    const [result] = await db.execute(
      'UPDATE resources SET title = ?, description = ?, type = ?, url = ?, category = ? WHERE id = ?',
      [title, description, type, url, category, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json({ message: 'Resource updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete resource (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM resources WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

