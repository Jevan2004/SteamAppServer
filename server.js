const express = require('express');
const cors = require('cors');
const gamesRouter = require('./routes/games');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'SteamDb',
  password: process.env.DB_PASSWORD || '2004',
  port: process.env.DB_PORT || 5432,});

  pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => {
    console.error('PostgreSQL connection error:', err);
    process.exit(1); // Stop the app if DB isn't available
  });

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', gamesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});