const express = require('express');
const router = express.Router();

// In-memory data store
let games = [
  {
    id: 1,
    title: "Counter Strike 2",
    bannerImage: "/images/Cs2-banner.png",
    image: "/images/Cs2.jpg",
    description: "For over two decades, Counter-Strike has offered an elite competitive experience...",
    developer: "Valve",
    releaseDate: "1 July 2023",
    averageReviews: "3/5",
    tags: ["FPS", "Multiplayer", "Shooter"],
    price: "Free",
  },
  {
    id: 2,
    title: "Dark Souls III",
    bannerImage: "/images/header.jpg",
    image: "/images/ds3cover.jpg",
    description: "As fires fade and the world falls into ruin...",
    developer: "FromSoftware",
    releaseDate: "11 Apr 2016",
    averageReviews: "5/5",
    tags: ["Souls-like", "Rpg", "Dark Fantasy"],
    price: "40$",
  },
  ...Array(200)
    .fill()
    .map((_, index) => ({
      id: index + 3,
      title: `Game ${index + 3}`,
      bannerImage: "/images/placeholder.jpg", 
      image: "/images/placeholder.jpg", 
      description: "No description available.",
      developer: "Unknown",
      releaseDate: "N/A",
      averageReviews: "0",
      tags: ["Unknown"],
      price: "N/A",
    })),
];
let userStats = [
  {
    userId: 1,
    achievements: 15,
    hoursPlayed: 50,
    finished: true,
    score: 8.5,
    review: "Amazing game, lots of fun!",
  },
  {
    userId: 2,
    achievements: 25,
    hoursPlayed: 130,
    finished: true,
    score: 10,
    review: "Praise the sun!",
  },
  ...Array(200)
    .fill()
    .map((_, index) => ({
      userId: index + 3,
      achievements: Math.floor(Math.random() * 50), // Random achievements count
      hoursPlayed: Math.floor(Math.random() * 200), // Random hours played
      finished: Math.random() > 0.5, // Random finished state
      score: (Math.random() * 10).toFixed(1), // Random score between 0 and 10
      review: "No review yet.",
    })),
];

// GET all games
router.get('/games', (req, res) => {
  res.json(games);
});

// GET game by ID
router.get('/games/:id', (req, res) => {
  const game = games.find(g => g.id === parseInt(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

// GET user stats for a game
router.get('/user-stats/:gameId', (req, res) => {
  const stats = userStats[req.params.gameId];
  if (!stats) return res.status(404).json({ error: 'Stats not found' });
  res.json(stats);
});

// POST new game
router.post('/games', (req, res) => {
  const newGame = req.body;
  
  // Validate required fields
  if (!newGame.id || !newGame.title) {
    return res.status(400).json({ error: 'ID and title are required' });
  }
  
  // Check for duplicate ID
  if (games.some(game => game.id === newGame.id)) {
    return res.status(400).json({ error: 'Game ID already exists' });
  }
  
  // Set defaults for optional fields
  const gameWithDefaults = {
    bannerImage: "/images/placeholder.jpg",
    image: "/images/placeholder.jpg",
    description: "No description available.",
    developer: "Unknown",
    releaseDate: "N/A",
    averageReviews: "0",
    tags: ["Unknown"],
    price: "10$",
    ...newGame
  };
  
  games.push(gameWithDefaults);
  res.status(201).json(gameWithDefaults);
});

// POST user stats for a game
router.post('/games/:id/stats', (req, res) => {
  const gameId = req.params.id;
  const stats = req.body;
  
  // Validate required stats
  if (typeof stats.achievements !== 'number' || 
      typeof stats.hoursPlayed !== 'number' ||
      typeof stats.score !== 'number') {
    return res.status(400).json({ error: 'Invalid stats format' });
  }
  
  userStats[gameId] = stats;
  res.status(201).json(stats);
});

// PUT update game
router.put('/games/:id', (req, res) => {
  const index = games.findIndex(g => g.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Game not found' });
  
  games[index] = { ...games[index], ...req.body };
  res.json(games[index]);
});

// DELETE game
router.delete('/games/:id', (req, res) => {
  const index = games.findIndex(g => g.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Game not found' });
  
  const deletedGame = games.splice(index, 1)[0];
  delete userStats[req.params.id];
  res.json(deletedGame);
});

// module.exports = {
//   router,
//   games,
//   userStats
// };

module.exports = router;