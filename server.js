const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/colleges', require('./routes/colleges'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/roadmaps', require('./routes/roadmaps'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Career Compass API is running', status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

