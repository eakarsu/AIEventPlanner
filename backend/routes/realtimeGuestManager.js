// Real-time guest manager: live RSVP / dietary / plus-one tracking.
const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

// GET /api/realtime-guest-manager/:event_id/live
router.get('/:event_id/live', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE rsvp_status='confirmed') AS confirmed,
         COUNT(*) FILTER (WHERE rsvp_status='declined') AS declined,
         COUNT(*) FILTER (WHERE rsvp_status='pending') AS pending,
         COUNT(*) FILTER (WHERE plus_one = true) AS plus_ones
       FROM guests WHERE event_id = $1`,
      [req.params.event_id]
    ).catch(() => ({ rows: [{}] }));
    const diet = await pool.query(
      `SELECT dietary_restriction, COUNT(*) AS n FROM guests WHERE event_id = $1 AND dietary_restriction IS NOT NULL GROUP BY dietary_restriction`,
      [req.params.event_id]
    ).catch(() => ({ rows: [] }));
    return res.json({ event_id: req.params.event_id, summary: r.rows[0], dietary: diet.rows, generated_at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: 'live failed' });
  }
});

module.exports = { router, setPool };
