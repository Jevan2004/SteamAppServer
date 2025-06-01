const express = require('express');
const cors = require('cors');
const gamesRouter = require('./routes/games');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

  pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => {
    console.error('PostgreSQL connection error:', err);
    process.exit(1); 
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