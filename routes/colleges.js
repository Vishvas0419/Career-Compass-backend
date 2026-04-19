const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all colleges
router.get('/', async (req, res) => {
  try {
    const { location, type, course } = req.query;
    let query = 'SELECT * FROM colleges WHERE 1=1';
    const params = [];

    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY name';

    const [colleges] = await db.execute(query, params);
    
    // Filter by course if provided
    if (course) {
      const filtered = colleges.filter(college => {
        const courses = JSON.parse(college.courses || '[]');
        return courses.some(c => c.toLowerCase().includes(course.toLowerCase()));
      });
      return res.json(filtered);
    }

    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get college by ID
router.get('/:id', async (req, res) => {
  try {
    const [colleges] = await db.execute('SELECT * FROM colleges WHERE id = ?', [req.params.id]);
    
    if (colleges.length === 0) {
      return res.status(404).json({ message: 'College not found' });
    }

    res.json(colleges[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create college (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, location, courses, fees, type, entrance_exam, website } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const [result] = await db.execute(
      'INSERT INTO colleges (name, location, courses, fees, type, entrance_exam, website) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, location || null, JSON.stringify(courses || []), fees || null, type || 'Private', entrance_exam || null, website || null]
    );

    res.status(201).json({ message: 'College created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update college (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, location, courses, fees, type, entrance_exam, website } = req.body;

    const [result] = await db.execute(
      'UPDATE colleges SET name = ?, location = ?, courses = ?, fees = ?, type = ?, entrance_exam = ?, website = ? WHERE id = ?',
      [name, location, JSON.stringify(courses), fees, type, entrance_exam, website, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'College not found' });
    }

    res.json({ message: 'College updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete college (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM colleges WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'College not found' });
    }

    res.json({ message: 'College deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

