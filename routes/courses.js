const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { category, level, career_id } = req.query;
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }
    if (career_id) {
      query += ' AND career_id = ?';
      params.push(career_id);
    }

    query += ' ORDER BY title';

    const [courses] = await db.execute(query, params);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const [courses] = await db.execute('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(courses[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create course (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, instructor, duration, price, category, level, skills_covered, career_id } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: 'Title and price are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO courses (title, description, instructor, duration, price, category, level, skills_covered, career_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || null, instructor || null, duration || null, price, category || null, level || null, skills_covered || null, career_id || null]
    );

    res.status(201).json({ message: 'Course created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update course (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, instructor, duration, price, category, level, skills_covered, career_id } = req.body;

    const [result] = await db.execute(
      'UPDATE courses SET title = ?, description = ?, instructor = ?, duration = ?, price = ?, category = ?, level = ?, skills_covered = ?, career_id = ? WHERE id = ?',
      [title, description, instructor, duration, price, category, level, skills_covered, career_id, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Enroll in course
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    // Check if already enrolled
    const [existing] = await db.execute(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, req.params.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create enrollment
    await db.execute(
      'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [req.user.id, req.params.id]
    );

    // Update enrollment count
    await db.execute('UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ message: 'Enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user enrollments
router.get('/user/enrollments', authMiddleware, async (req, res) => {
  try {
    const [enrollments] = await db.execute(
      `SELECT c.*, e.enrolled_at, e.status 
       FROM courses c 
       INNER JOIN enrollments e ON c.id = e.course_id 
       WHERE e.user_id = ? 
       ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

