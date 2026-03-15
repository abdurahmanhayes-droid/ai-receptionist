const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all calls
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, 
             COUNT(*) OVER() as total_count
      FROM calls c
      WHERE c.business_id = $1
    `;
    const params = [req.user.businessId];
    let paramCount = 2;

    if (status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (startDate) {
      query += ` AND c.started_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND c.started_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY c.started_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      calls: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows[0]?.total_count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get single call with conversation
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const callResult = await pool.query(
      'SELECT * FROM calls WHERE id = $1 AND business_id = $2',
      [id, req.user.businessId]
    );

    if (callResult.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const conversationResult = await pool.query(
      'SELECT * FROM conversation_turns WHERE call_id = $1 ORDER BY turn_number',
      [id]
    );

    res.json({
      call: callResult.rows[0],
      conversation: conversationResult.rows
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call details' });
  }
});

// Get messages
router.get('/messages/all', authenticate, async (req, res) => {
  try {
    const { status = 'unread' } = req.query;

    const result = await pool.query(
      `SELECT m.*, c.caller_number as call_from
       FROM messages m
       LEFT JOIN calls c ON m.call_id = c.id
       WHERE m.business_id = $1 AND m.status = $2
       ORDER BY m.created_at DESC`,
      [req.user.businessId, status]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as read
router.put('/messages/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE messages 
       SET status = 'read', read_at = NOW()
       WHERE id = $1 AND business_id = $2
       RETURNING *`,
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

module.exports = router;
