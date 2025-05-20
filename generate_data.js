require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { Pool } = require('pg');

// Initialize connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'yourdbname',
  password: process.env.DB_PASSWORD || 'yourpassword',
  port: process.env.DB_PORT || 5432,
});

// Image options
const imageOptions = [
  '/images/Cs2.jpg',
  '/images/ds3cover.jpg',
  '/images/placeholder.jpg'
];

async function generateGames(count) {
  console.log(`Generating ${count} games...`);
  for (let i = 0; i < count; i++) {
    await pool.query(
      `INSERT INTO games (title, description, price, developer, release_date, image) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        faker.commerce.productName(),
        faker.lorem.paragraph(),
        faker.commerce.price({ min: 5, max: 100 }),
        faker.company.name(),
        faker.date.past({ years: 10 }),
        faker.helpers.arrayElement(imageOptions)
      ]
    );
    if (i % 1000 === 0) console.log(`Generated ${i} games`);
  }
}

async function generateUsers(count) {
  console.log(`\nGenerating ${count} unique users...`);
  const existingUsernames = new Set();
  const existingEmails = new Set();
  
  for (let i = 0; i < count; i++) {
    let username, email;
    let attempts = 0;
    const maxAttempts = 100;

    // Generate unique username and email
    do {
      username = faker.internet.username();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique username after maximum attempts');
      }
    } while (existingUsernames.has(username));
    
    attempts = 0;
    do {
      email = faker.internet.email();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique email after maximum attempts');
      }
    } while (existingEmails.has(email));
    
    existingUsernames.add(username);
    existingEmails.add(email);

    await pool.query(
      `INSERT INTO users (username, email, created_at) 
       VALUES ($1, $2, $3)`,
      [username, email, faker.date.past({ years: 5 })]
    );
    
    if (i % 1000 === 0) console.log(`Generated ${i} users`);
  }
}

async function generateUserStats(count) {
  console.log('\nFetching existing IDs...');
  const games = await pool.query('SELECT id FROM games');
  const users = await pool.query('SELECT id FROM users');
  const existingStats = await pool.query('SELECT user_id, game_id FROM user_game_stats');

  const dbPairs = new Set(existingStats.rows.map(r => `${r.user_id}_${r.game_id}`));
  const existingPairs = new Set(); // new in this session

  console.log(`Generating ${count} unique user stats...`);
  
  let inserted = 0;
  let attempts = 0;
  const maxAttempts = count * 10;

  while (inserted < count && attempts < maxAttempts) {
    const userIndex = faker.number.int({ min: 0, max: users.rows.length - 1 });
    const gameIndex = faker.number.int({ min: 0, max: games.rows.length - 1 });

    const userId = users.rows[userIndex].id;
    const gameId = games.rows[gameIndex].id;
    const pairKey = `${userId}_${gameId}`;

    if (existingPairs.has(pairKey) || dbPairs.has(pairKey)) {
      attempts++;
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO user_game_stats 
         (user_id, game_id, achievements, hours_played, score, review, finished) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          gameId,
          faker.number.int({ min: 0, max: 100 }),
          faker.number.int({ min: 1, max: 500 }),
          faker.number.int({ min: 1, max: 10 }),
          faker.lorem.sentence(),
          faker.datatype.boolean()
        ]
      );
      existingPairs.add(pairKey);
      inserted++;
      if (inserted % 1000 === 0) console.log(`Generated ${inserted} stats`);
    } catch (err) {
      console.warn(`Skipped duplicate or error: ${err.code}`);
    }
    attempts++;
  }

  console.log(`Generated ${inserted} stats out of requested ${count}`);
}


async function main() {
  try {
    console.time('Data generation completed in');
    
    // Start with smaller numbers for testing
    await generateGames(10);
    await generateUsers(1);
    await generateUserStats(90000);
    
    console.timeEnd('Data generation completed in');
  } catch (error) {
    console.error('Error during data generation:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

main();