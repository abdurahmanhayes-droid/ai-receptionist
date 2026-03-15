const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, businessName, industry } = req.body;

    // Validate input
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'Email, password, and business name are required' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, passwordHash, firstName, lastName]
      );
      const userId = userResult.rows[0].id;

      // Create business
      const businessResult = await client.query(
        'INSERT INTO businesses (user_id, business_name, industry, subscription_tier) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, businessName, industry, 'starter']
      );
      const businessId = businessResult.rows[0].id;

      // Create default AI config
      await client.query(
        `INSERT INTO ai_configs (business_id, greeting_message) 
         VALUES ($1, $2)`,
        [businessId, `Thank you for calling ${businessName}. How can I help you today?`]
      );

      await client.query('COMMIT');

      // Generate JWT
      const token = jwt.sign(
        { userId, businessId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || '7d' }
      );

      res.status(201).json({
        token,
        user: { id: userId, email, firstName, lastName },
        business: { id: businessId, name: businessName }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
              b.id as business_id, b.business_name
       FROM users u
       LEFT JOIN businesses b ON u.id = b.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, businessId: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      business: {
        id: user.business_id,
        name: user.business_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              b.id as business_id, b.business_name
       FROM users u
       LEFT JOIN businesses b ON u.id = b.user_id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      business: {
        id: user.business_id,
        name: user.business_name
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
