const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get dashboard overview
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Total calls
    const callsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_calls,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_calls,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_calls,
         AVG(duration) FILTER (WHERE duration IS NOT NULL) as avg_duration,
         SUM(duration) FILTER (WHERE duration IS NOT NULL) as total_minutes
       FROM calls
       WHERE business_id = $1
         AND started_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
         AND started_at <= COALESCE($3::timestamp, NOW())`,
      [req.user.businessId, startDate, endDate]
    );

    // Appointments
    const appointmentsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_appointments,
         COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'canceled') as canceled
       FROM appointments
       WHERE business_id = $1
         AND created_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
         AND created_at <= COALESCE($3::timestamp, NOW())`,
      [req.user.businessId, startDate, endDate]
    );

    // Messages
    const messagesResult = await pool.query(
      `SELECT 
         COUNT(*) as total_messages,
         COUNT(*) FILTER (WHERE status = 'unread') as unread,
         COUNT(*) FILTER (WHERE urgency = 'urgent') as urgent
       FROM messages
       WHERE business_id = $1
         AND created_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
         AND created_at <= COALESCE($3::timestamp, NOW())`,
      [req.user.businessId, startDate, endDate]
    );

    // Intent breakdown
    const intentResult = await pool.query(
      `SELECT 
         intent,
         COUNT(*) as count
       FROM calls
       WHERE business_id = $1
         AND intent IS NOT NULL
         AND started_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
         AND started_at <= COALESCE($3::timestamp, NOW())
       GROUP BY intent
       ORDER BY count DESC`,
      [req.user.businessId, startDate, endDate]
    );

    // Sentiment breakdown
    const sentimentResult = await pool.query(
      `SELECT 
         sentiment,
         COUNT(*) as count
       FROM calls
       WHERE business_id = $1
         AND sentiment IS NOT NULL
         AND started_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
         AND started_at <= COALESCE($3::timestamp, NOW())
       GROUP BY sentiment`,
      [req.user.businessId, startDate, endDate]
    );

    res.json({
      calls: callsResult.rows[0],
      appointments: appointmentsResult.rows[0],
      messages: messagesResult.rows[0],
      intents: intentResult.rows,
      sentiment: sentimentResult.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get call volume by day
router.get('/call-volume', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT 
         DATE(started_at) as date,
         COUNT(*) as call_count,
         AVG(duration) as avg_duration,
         COUNT(*) FILTER (WHERE outcome = 'resolved') as resolved_count
       FROM calls
       WHERE business_id = $1
         AND started_at >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY DATE(started_at)
       ORDER BY date`,
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching call volume:', error);
    res.status(500).json({ error: 'Failed to fetch call volume' });
  }
});

// Get peak hours
router.get('/peak-hours', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         EXTRACT(HOUR FROM started_at) as hour,
         COUNT(*) as call_count
       FROM calls
       WHERE business_id = $1
         AND started_at >= NOW() - INTERVAL '30 days'
       GROUP BY hour
       ORDER BY hour`,
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching peak hours:', error);
    res.status(500).json({ error: 'Failed to fetch peak hours' });
  }
});

// Get subscription usage
router.get('/subscription-usage', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         s.tier,
         s.minutes_included,
         s.minutes_used,
         s.billing_cycle_start,
         s.billing_cycle_end,
         ROUND((s.minutes_used::numeric / s.minutes_included::numeric * 100), 2) as usage_percentage
       FROM subscriptions s
       WHERE s.business_id = $1
         AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.json({ tier: 'none', usage: 0 });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subscription usage:', error);
    res.status(500).json({ error: 'Failed to fetch subscription usage' });
  }
});

module.exports = router;
