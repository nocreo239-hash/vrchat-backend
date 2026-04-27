const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
async function addUser(username, password, tier) {
  const safeUsername = String(username || '').replace(/[^a-zA-Z0-9_\-.@]/g, '').slice(0, 64);
  const safePassword = String(password || '').slice(0, 128);
  const safeTier = Math.max(1, Math.min(3, Number(tier) || 1));

  if (!safeUsername || !safePassword) {
    throw new Error('Username and password are required.');
  }

  const hash = await bcrypt.hash(safePassword, 12);
  await pool.query('INSERT INTO users (username, password_hash, tier) VALUES ($1, $2, $3)', [safeUsername, hash, safeTier]);
  console.log(`User "${safeUsername}" created with tier ${safeTier}.`);
}

// Usage: node add-user.js CoolUser SecurePassword123 2
(async () => {
  try {
    const username = process.argv[2];
    const password = process.argv[3];
    const tier = process.argv[4];
    await addUser(username, password, tier);
  } finally {
    await pool.end();
  }
})();
