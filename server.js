const express = require('express');
const cors = require('cors');
const gamesRouter = require('./routes/games');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', gamesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});