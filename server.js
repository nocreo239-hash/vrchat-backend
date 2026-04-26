const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Too many attempts. Please wait.' });
  }
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20
});

const TIER_LIMITS = { 1: 10, 2: 12, 3: 15 };
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'https://images.your-backend.com';

// In-memory short-lived token store (replace with Redis for scale).
const loginTokens = new Map();
const TOKEN_TTL_MS = 45 * 1000;

function buildImageUrls(userId, images) {
  return images.map((img) => `${IMAGE_BASE_URL}/users/${userId}/slot_${String(img.slot_index).padStart(2, '0')}.jpg`);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9_\-.@]/g, '').substring(0, 64);
}

function issueToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  loginTokens.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

function consumeToken(token) {
  const data = loginTokens.get(token);
  if (!data) return null;
  loginTokens.delete(token);
  if (Date.now() > data.expiresAt) return null;
  return data.userId;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of loginTokens.entries()) {
    if (now > data.expiresAt) loginTokens.delete(token);
  }
}, 30 * 1000).unref();

// Legacy endpoint (compatible with current Udon flow).
app.get('/api/auth', authLimiter, async (req, res) => {
  const username = sanitizeString(req.query.user || '');
  const password = (req.query.pass || '').substring(0, 128);

  if (!username || !password) {
    return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Missing credentials.' });
  }

  try {
    const userResult = await pool.query('SELECT id, password_hash, tier, is_active FROM users WHERE username = $1 LIMIT 1', [username]);
    if (userResult.rows.length === 0) {
      return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Invalid username or password.' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Account is disabled.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Invalid username or password.' });
    }

    const tierLimit = TIER_LIMITS[user.tier] || 10;
    const imageResult = await pool.query(
      'SELECT slot_index, image_key FROM user_images WHERE user_id = $1 AND slot_index < $2 ORDER BY slot_index ASC',
      [user.id, tierLimit]
    );

    const urls = buildImageUrls(user.id, imageResult.rows);
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    return res.json({ success: true, tier: user.tier, displayName: username, urls, error: '' });
  } catch (err) {
    console.error('[Auth Error]', err);
    return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Server error. Please try again.' });
  }
});

// Recommended safer flow for Udon: request one-time token then call /authByToken.
app.get('/api/requestToken', authLimiter, async (req, res) => {
  const username = sanitizeString(req.query.user || '');
  const password = (req.query.pass || '').substring(0, 128);

  if (!username || !password) {
    return res.json({ success: false, token: '', error: 'Missing credentials.' });
  }

  try {
    const userResult = await pool.query('SELECT id, password_hash, is_active FROM users WHERE username = $1 LIMIT 1', [username]);
    if (userResult.rows.length === 0) {
      return res.json({ success: false, token: '', error: 'Invalid username or password.' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) return res.json({ success: false, token: '', error: 'Account is disabled.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.json({ success: false, token: '', error: 'Invalid username or password.' });

    return res.json({ success: true, token: issueToken(user.id), error: '' });
  } catch (err) {
    console.error('[requestToken Error]', err);
    return res.json({ success: false, token: '', error: 'Server error. Please try again.' });
  }
});

app.get('/api/authByToken', tokenLimiter, async (req, res) => {
  const token = sanitizeString((req.query.token || '').substring(0, 128));
  if (!token) return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Missing token.' });

  try {
    const userId = consumeToken(token);
    if (!userId) return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Invalid or expired token.' });

    const userResult = await pool.query('SELECT username, tier, is_active FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (userResult.rows.length === 0) return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'User not found.' });

    const user = userResult.rows[0];
    if (!user.is_active) return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Account is disabled.' });

    const tierLimit = TIER_LIMITS[user.tier] || 10;
    const imageResult = await pool.query(
      'SELECT slot_index, image_key FROM user_images WHERE user_id = $1 AND slot_index < $2 ORDER BY slot_index ASC',
      [userId, tierLimit]
    );

    const urls = buildImageUrls(userId, imageResult.rows);
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);

    return res.json({ success: true, tier: user.tier, displayName: user.username, urls, error: '' });
  } catch (err) {
    console.error('[authByToken Error]', err);
    return res.json({ success: false, tier: 0, displayName: '', urls: [], error: 'Server error. Please try again.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
