const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// pool is passed in from server.js
let pool;
const setPool = (p) => { pool = p; };

// POST /api/rsvp/generate-link
// Authenticated: creates a unique RSVP token for a guest invitation
router.post('/generate-link', async (req, res) => {
  try {
    const { invitation_id } = req.body;
    if (!invitation_id) {
      return res.status(400).json({ error: 'invitation_id is required' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvp_tokens (
        id SERIAL PRIMARY KEY,
        invitation_id INTEGER,
        token VARCHAR(100) UNIQUE,
        expires_at TIMESTAMP,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      `INSERT INTO rsvp_tokens (invitation_id, token, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [invitation_id, token, expires_at]
    );

    res.json({
      token: result.rows[0].token,
      expires_at: result.rows[0].expires_at,
      rsvp_url: `/api/rsvp/${token}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rsvp/:token — public endpoint, returns guest + event info
router.get('/:token', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvp_tokens (
        id SERIAL PRIMARY KEY,
        invitation_id INTEGER,
        token VARCHAR(100) UNIQUE,
        expires_at TIMESTAMP,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const tokenResult = await pool.query(
      'SELECT * FROM rsvp_tokens WHERE token = $1',
      [req.params.token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid RSVP link' });
    }

    const tokenRow = tokenResult.rows[0];

    if (tokenRow.used) {
      return res.status(400).json({ error: 'This RSVP link has already been used' });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This RSVP link has expired' });
    }

    // Fetch invitation + guest + event info
    const invResult = await pool.query(
      `SELECT i.*, e.name as event_name, e.date as event_date, e.time as event_time, e.location as event_location
       FROM invitations i
       JOIN events e ON i.event_id = e.id
       WHERE i.id = $1`,
      [tokenRow.invitation_id]
    );

    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({
      invitation: invResult.rows[0],
      token_id: tokenRow.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rsvp/:token/respond — public, updates guest RSVP
router.post('/:token/respond', async (req, res) => {
  try {
    const { status, meal_preference, dietary_notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const tokenResult = await pool.query(
      'SELECT * FROM rsvp_tokens WHERE token = $1',
      [req.params.token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid RSVP link' });
    }

    const tokenRow = tokenResult.rows[0];

    if (tokenRow.used) {
      return res.status(400).json({ error: 'This RSVP link has already been used' });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This RSVP link has expired' });
    }

    // Get the invitation
    const invResult = await pool.query(
      'SELECT * FROM invitations WHERE id = $1',
      [tokenRow.invitation_id]
    );

    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invResult.rows[0];

    // Update invitation RSVP status
    await pool.query(
      'UPDATE invitations SET rsvp_status = $1 WHERE id = $2',
      [status, invitation.id]
    );

    // Update matching guest record if exists
    if (invitation.guest_email) {
      const updateFields = ['rsvp_status = $1'];
      const updateValues = [status];
      let paramIdx = 2;

      if (dietary_notes) {
        updateFields.push(`dietary_restrictions = $${paramIdx}`);
        updateValues.push(dietary_notes);
        paramIdx++;
      }

      updateValues.push(invitation.guest_email);
      await pool.query(
        `UPDATE guests SET ${updateFields.join(', ')} WHERE email = $${paramIdx}`,
        updateValues
      );
    }

    // Mark token as used
    await pool.query(
      'UPDATE rsvp_tokens SET used = TRUE WHERE id = $1',
      [tokenRow.id]
    );

    res.json({
      message: 'RSVP recorded successfully',
      status,
      meal_preference: meal_preference || null,
      dietary_notes: dietary_notes || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
