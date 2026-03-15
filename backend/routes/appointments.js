const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all appointments
router.get('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    let query = `
      SELECT a.*, c.caller_number, c.transcription as call_notes
      FROM appointments a
      LEFT JOIN calls c ON a.call_id = c.id
      WHERE a.business_id = $1
    `;
    const params = [req.user.businessId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND a.appointment_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND a.appointment_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY a.appointment_date, a.appointment_time`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create appointment manually
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      appointmentDate,
      appointmentTime,
      durationMinutes,
      serviceType,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO appointments 
       (business_id, customer_name, customer_phone, customer_email, 
        appointment_date, appointment_time, duration_minutes, service_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.businessId, customerName, customerPhone, customerEmail,
       appointmentDate, appointmentTime, durationMinutes || 30, serviceType, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      appointmentDate,
      appointmentTime,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE appointments
       SET appointment_date = COALESCE($1, appointment_date),
           appointment_time = COALESCE($2, appointment_time),
           status = COALESCE($3, status),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5 AND business_id = $6
       RETURNING *`,
      [appointmentDate, appointmentTime, status, notes, id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE appointments
       SET status = 'canceled', updated_at = NOW()
       WHERE id = $1 AND business_id = $2
       RETURNING *`,
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

module.exports = router;
