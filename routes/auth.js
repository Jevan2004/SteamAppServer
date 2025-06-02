const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const JWT_KEY = 'Cristina';

const router = express.Router();

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const pool = req.pool;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    console.log('Login attempt:', username, password);
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
     JWT_KEY,
      { expiresIn: '2h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  // For stateless JWT, logout is handled on frontend by deleting token
  res.json({ message: 'Logout successful' });
});

module.exports = router;
