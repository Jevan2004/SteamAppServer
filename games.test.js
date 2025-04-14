const request = require('supertest');
const express = require('express');
const { router, games, userStats } = require('./routes/games');

// Create test app
const app = express();
app.use(express.json());
app.use('/api', router);

describe('Games API', () => {
  // Store original data for restoration
  let originalGames, originalUserStats;

  beforeAll(() => {
    // Save original data
    originalGames = [...games];
    originalUserStats = {...userStats};
  });

  beforeEach(() => {
    // Reset to original data before each test
    games.length = 0;
    games.push(...originalGames);
    Object.assign(userStats, originalUserStats);
  });

  describe('GET /api/games', () => {
    it('should return all games', async () => {
      const response = await request(app).get('/api/games');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Counter Strike 2');
    });
  });

  describe('GET /api/games/:id', () => {
    it('should return a game by ID', async () => {
      const response = await request(app).get('/api/games/1');
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Counter Strike 2');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app).get('/api/games/999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game not found');
    });
  });

  describe('POST /api/games', () => {
    it('should create a new game', async () => {
      const newGame = {
        id: 3,
        title: 'New Test Game',
        price: '29.99$'
      };

      const response = await request(app)
        .post('/api/games')
        .send(newGame);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Test Game');
      expect(games).toHaveLength(3); // Changed from gamesRouter.games to games
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({ id: 3 }); // Missing title

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID and title are required');
    });

    it('should return 400 for duplicate ID', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({ id: 1, title: 'Duplicate Game' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Game ID already exists');
    });
  });

  describe('GET /api/user-stats/:gameId', () => {
    it('should return user stats for a game', async () => {
      const response = await request(app).get('/api/user-stats/1');
      expect(response.status).toBe(200);
      expect(response.body.score).toBe(8.5);
    });

    it('should return 404 for non-existent stats', async () => {
      const response = await request(app).get('/api/user-stats/999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Stats not found');
    });
  });

  describe('POST /api/games/:id/stats', () => {
    it('should create/update user stats', async () => {
      const newStats = {
        achievements: 30,
        hoursPlayed: 75,
        score: 9,
        review: 'Great game!'
      };

      const response = await request(app)
        .post('/api/games/1/stats')
        .send(newStats);

      expect(response.status).toBe(201);
      expect(response.body.score).toBe(9);
      expect(userStats[1].score).toBe(9); // Changed from gamesRouter.userStats to userStats
    });

    it('should return 400 for invalid stats format', async () => {
      const response = await request(app)
        .post('/api/games/1/stats')
        .send({ achievements: 'not a number' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid stats format');
    });
  });

  describe('PUT /api/games/:id', () => {
    it('should update a game', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'New description'
      };

      const response = await request(app)
        .put('/api/games/1')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('New description');
      // Verify other fields remain unchanged
      expect(response.body.price).toBe('Free');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .put('/api/games/999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game not found');
    });
  });

  describe('DELETE /api/games/:id', () => {
    it('should delete a game and its stats', async () => {
      const response = await request(app).delete('/api/games/1');
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Counter Strike 2');
      expect(games).toHaveLength(1); // Changed from gamesRouter.games to games
      expect(userStats[1]).toBeUndefined(); // Changed from gamesRouter.userStats to userStats
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app).delete('/api/games/999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game not found');
    });
  });
});