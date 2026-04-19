const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Create payment (Dummy payment)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { course_id, payment_method } = req.body;

    if (!course_id) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Get course details
    const [courses] = await db.execute('SELECT * FROM courses WHERE id = ?', [course_id]);
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courses[0];

    // Generate dummy transaction ID
    const transaction_id = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Create payment record (dummy - always succeeds)
    const [result] = await db.execute(
      'INSERT INTO payments (user_id, course_id, amount, payment_method, transaction_id, status, paid_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [req.user.id, course_id, course.price, payment_method || 'dummy', transaction_id, 'completed']
    );

    // Auto-enroll after payment
    await db.execute(
      'INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [req.user.id, course_id]
    );

    // Update enrollment count
    await db.execute('UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = ?', [course_id]);

    res.json({
      message: 'Payment successful',
      payment: {
        id: result.insertId,
        transaction_id,
        amount: course.price,
        status: 'completed'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const [payments] = await db.execute(
      `SELECT p.*, c.title as course_title 
       FROM payments p 
       INNER JOIN courses c ON p.course_id = c.id 
       WHERE p.user_id = ? 
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [payments] = await db.execute(
      `SELECT p.*, c.title as course_title 
       FROM payments p 
       INNER JOIN courses c ON p.course_id = c.id 
       WHERE p.id = ? AND p.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payments[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

