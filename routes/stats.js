// routes/stats.js
const express = require('express');
const router = express.Router();

// Optimized endpoint for game statistics
router.get('/games/top-rated', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT 
        g.id,
        g.title,
        g.developer,
        COUNT(ugs.id) AS ratings_count,
        AVG(ugs.score) AS average_score,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ugs.score) AS median_score
      FROM games g
      JOIN user_game_stats ugs ON g.id = ugs.game_id
      GROUP BY g.id
      HAVING COUNT(ugs.id) >= 10
      ORDER BY average_score DESC
      LIMIT $1
    `;
    
    const { rows } = await req.pool.query(query, [limit]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;