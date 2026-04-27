const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        tier SMALLINT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        slot_index SMALLINT NOT NULL,
        image_key VARCHAR(512) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, slot_index)
      );
    `);

    console.log("✅ DB lista");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

setup();