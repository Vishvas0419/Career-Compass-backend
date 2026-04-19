const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all roadmaps
router.get('/', async (req, res) => {
  try {
    const { stream } = req.query;
    let query = 'SELECT * FROM roadmaps WHERE 1=1';
    const params = [];

    if (stream) {
      query += ' AND stream LIKE ?';
      params.push(`%${stream}%`);
    }

    query += ' ORDER BY stream';

    const [roadmaps] = await db.execute(query, params);
    res.json(roadmaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get roadmap by ID
router.get('/:id', async (req, res) => {
  try {
    const [roadmaps] = await db.execute('SELECT * FROM roadmaps WHERE id = ?', [req.params.id]);
    
    if (roadmaps.length === 0) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    res.json(roadmaps[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get roadmap by stream
router.get('/stream/:stream', async (req, res) => {
  try {
    const [roadmaps] = await db.execute(
      'SELECT * FROM roadmaps WHERE stream LIKE ?',
      [`%${req.params.stream}%`]
    );

    if (roadmaps.length === 0) {
      return res.status(404).json({ message: 'Roadmap not found for this stream' });
    }

    res.json(roadmaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create roadmap (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { stream, mermaid_code, description } = req.body;

    if (!stream || !mermaid_code) {
      return res.status(400).json({ message: 'Stream and mermaid_code are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO roadmaps (stream, mermaid_code, description) VALUES (?, ?, ?)',
      [stream, mermaid_code, description || null]
    );

    res.status(201).json({ message: 'Roadmap created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update roadmap (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { stream, mermaid_code, description } = req.body;

    const [result] = await db.execute(
      'UPDATE roadmaps SET stream = ?, mermaid_code = ?, description = ? WHERE id = ?',
      [stream, mermaid_code, description, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    res.json({ message: 'Roadmap updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete roadmap (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM roadmaps WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    res.json({ message: 'Roadmap deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

