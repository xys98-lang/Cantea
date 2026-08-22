import express from 'express';

const router = express.Router();

// Register route
router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint', status: 'ok' });
});

// Login route
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint', status: 'ok' });
});

// Get user route
router.get('/me', (req, res) => {
  res.json({ message: 'Get user endpoint', status: 'ok' });
});

export default router;