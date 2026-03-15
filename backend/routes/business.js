const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get business details
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, ac.greeting_message, ac.voice_id, ac.language, ac.personality, 
              ac.custom_instructions, ac.transfer_number
       FROM businesses b
       LEFT JOIN ai_configs ac ON b.id = ac.business_id
       WHERE b.id = $1`,
      [req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business details' });
  }
});

// Update business details
router.put('/', authenticate, async (req, res) => {
  try {
    const {
      businessName,
      industry,
      phoneNumber,
      email,
      address,
      timezone,
      businessHours
    } = req.body;

    const result = await pool.query(
      `UPDATE businesses 
       SET business_name = COALESCE($1, business_name),
           industry = COALESCE($2, industry),
           phone_number = COALESCE($3, phone_number),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           timezone = COALESCE($6, timezone),
           business_hours = COALESCE($7, business_hours),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [businessName, industry, phoneNumber, email, address, timezone, 
       businessHours ? JSON.stringify(businessHours) : null, req.user.businessId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Get AI configuration
router.get('/ai-config', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_configs WHERE business_id = $1',
      [req.user.businessId]
    );

    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// Update AI configuration
router.put('/ai-config', authenticate, async (req, res) => {
  try {
    const {
      greetingMessage,
      voiceId,
      voiceSpeed,
      language,
      personality,
      customInstructions,
      transferNumber,
      escalationKeywords
    } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_configs (business_id, greeting_message, voice_id, voice_speed, 
                               language, personality, custom_instructions, transfer_number,
                               escalation_keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (business_id) 
       DO UPDATE SET
         greeting_message = COALESCE($2, ai_configs.greeting_message),
         voice_id = COALESCE($3, ai_configs.voice_id),
         voice_speed = COALESCE($4, ai_configs.voice_speed),
         language = COALESCE($5, ai_configs.language),
         personality = COALESCE($6, ai_configs.personality),
         custom_instructions = COALESCE($7, ai_configs.custom_instructions),
         transfer_number = COALESCE($8, ai_configs.transfer_number),
         escalation_keywords = COALESCE($9, ai_configs.escalation_keywords),
         updated_at = NOW()
       RETURNING *`,
      [req.user.businessId, greetingMessage, voiceId, voiceSpeed, language,
       personality, customInstructions, transferNumber, escalationKeywords]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Knowledge base routes
router.get('/knowledge-base', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM knowledge_base WHERE business_id = $1 ORDER BY category, created_at',
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

router.post('/knowledge-base', authenticate, async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    const result = await pool.query(
      `INSERT INTO knowledge_base (business_id, question, answer, category)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.businessId, question, answer, category]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating knowledge base entry:', error);
    res.status(500).json({ error: 'Failed to create knowledge base entry' });
  }
});

router.put('/knowledge-base/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, isActive } = req.body;

    const result = await pool.query(
      `UPDATE knowledge_base 
       SET question = COALESCE($1, question),
           answer = COALESCE($2, answer),
           category = COALESCE($3, category),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5 AND business_id = $6
       RETURNING *`,
      [question, answer, category, isActive, id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating knowledge base entry:', error);
    res.status(500).json({ error: 'Failed to update knowledge base entry' });
  }
});

router.delete('/knowledge-base/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM knowledge_base WHERE id = $1 AND business_id = $2 RETURNING id',
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }

    res.json({ message: 'Knowledge base entry deleted' });
  } catch (error) {
    console.error('Error deleting knowledge base entry:', error);
    res.status(500).json({ error: 'Failed to delete knowledge base entry' });
  }
});

// Staff directory
router.get('/staff', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM staff WHERE business_id = $1 ORDER BY name',
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff directory' });
  }
});

router.post('/staff', authenticate, async (req, res) => {
  try {
    const { name, role, department, phoneNumber, email, availableHours } = req.body;

    const result = await pool.query(
      `INSERT INTO staff (business_id, name, role, department, phone_number, email, available_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.businessId, name, role, department, phoneNumber, email, 
       availableHours ? JSON.stringify(availableHours) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

module.exports = router;
