const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_KEY = 'Cristina';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET all games
// GET all games with search and pagination
router.get('/games', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 101 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;

    let query = `
      SELECT g.* 
      FROM games g
      LEFT JOIN user_game_stats ugs ON g.id = ugs.game_id AND ugs.user_id = $1
    `;
    const params = [userId];

    if (search) {
      query += ` WHERE g.title ILIKE $2`;
      params.push(`%${search}%`);
    }

    const limitOffsetIndex = params.length + 1;
    query += ` ORDER BY g.title LIMIT $${limitOffsetIndex} OFFSET $${limitOffsetIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await req.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


// GET game by ID
router.get('/games/:id', async (req, res) => {
  try {
    const { rows } = await req.pool.query('SELECT * FROM games WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});
// GET user stats with optional filters and pagination
router.get('/user-stats', async (req, res) => {
  try {
    const { userId = 1, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await req.pool.query(
      `SELECT * FROM user_game_stats
       WHERE user_id = $1
       ORDER BY game_id
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET user stats for a game
router.get('/user-stats/:gameId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await req.pool.query(
      `SELECT * 
       FROM user_game_stats 
       WHERE game_id = $1 AND user_id = $2`,
      [req.params.gameId, userId]
    );
    
    if (rows.length === 0) {
      return res.json({
        user_id: userId,
        game_id: parseInt(req.params.gameId),
        achievements: 0,
        hours_played: 0,
        finished: false,
        score: 0,
        review: "No stats yet"
      });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST new game
router.post('/games', async (req, res) => {
  const newGame = req.body;
  
  // Validate required fields
  if (!newGame.title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  try {
    const { rows } = await req.pool.query(
      `INSERT INTO games 
       (title, banner_image, image, description, developer, release_date, average_reviews, price) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        newGame.title,
        newGame.bannerImage || '/images/placeholder.jpg',
        newGame.image || '/images/placeholder.jpg',
        newGame.description || 'No description available.',
        newGame.developer || 'Unknown',
        newGame.releaseDate || 'N/A',
        newGame.averageReviews || '0',
        newGame.price || '10$'
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST user stats for a game
router.post('/games/:id/stats', async (req, res) => {
  const gameId = req.params.id;
  const stats = req.body;
  
  // Validate required stats
  if (typeof stats.userId !== 'number' || 
      typeof stats.achievements !== 'number' || 
      typeof stats.hoursPlayed !== 'number' ||
      typeof stats.score !== 'number') {
    return res.status(400).json({ error: 'Invalid stats format' });
  }
  
  try {
    const { rows } = await req.pool.query(
      `INSERT INTO user_game_stats 
       (user_id, game_id, achievements, hours_played, finished, score, review) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        stats.userId,
        gameId,
        stats.achievements,
        stats.hoursPlayed,
        stats.finished || false,
        stats.score,
        stats.review || 'No review yet.'
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT update game
// In your backend route file
router.put('/games/:id/stats', authenticateToken, async (req, res) => {
  const gameId = req.params.id;
  const userId = req.user.userId;
  const stats = req.body;
  
  try {
    // First try to update existing stats
    const updateResult = await req.pool.query(
      `UPDATE user_game_stats SET
       achievements = $1,
       hours_played = $2,
       finished = $3,
       score = $4,
       review = $5
       WHERE game_id = $6 AND user_id = $7
       RETURNING *`,
      [
        stats.achievements,
        stats.hours_played,
        stats.finished,
        stats.score,
        stats.review,
        gameId,
        userId
      ]
    );
    
    if (updateResult.rows.length > 0) {
      return res.json(updateResult.rows[0]);
    }
    
    // If no existing stats, create new ones
    const insertResult = await req.pool.query(
      `INSERT INTO user_game_stats 
       (user_id, game_id, achievements, hours_played, finished, score, review) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        userId,
        gameId,
        stats.achievements,
        stats.hours_played,
        stats.finished,
        stats.score,
        stats.review
      ]
    );
    
    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE game
router.delete('/games/:id', async (req, res) => {
  try {
    await req.pool.query('BEGIN');
    
    // First delete related stats
    await req.pool.query('DELETE FROM user_game_stats WHERE game_id = $1', [req.params.id]);
    
    // Then delete the game
    const { rows } = await req.pool.query(
      'DELETE FROM games WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    await req.pool.query('COMMIT');
    
    if (rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    res.json(rows[0]);
  } catch (err) {
    await req.pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/user-statistics', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 101 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;

    let query = `
    SELECT
      g.id AS game_id,
      g.title AS game_title,
      ugs.hours_played,
      ugs.score,
      ugs.finished,
      ugs.achievements,
      ugs.review
    FROM user_game_stats ugs
    JOIN games g ON ugs.game_id = g.id
    WHERE ugs.user_id = $1
    ORDER BY ugs.score DESC
    LIMIT 50
  `;
  const params = [userId];

    const { rows } = await req.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const pool = req.pool;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    const passwordMatch = (password === user.password);
    if (!passwordMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_KEY,
      { expiresIn: '2h' }
    );

    res.json({ token, userId: user.id });
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