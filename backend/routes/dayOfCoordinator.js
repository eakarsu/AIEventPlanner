// Day-of mobile coordinator: on-site timeline adjustments.
const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

// GET /api/day-of-coordinator/:event_id/timeline
router.get('/:event_id/timeline', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM event_timeline WHERE event_id = $1 ORDER BY scheduled_at ASC`, [req.params.event_id]).catch(() => ({ rows: [] }));
    return res.json({ event_id: req.params.event_id, count: r.rows.length, items: r.rows });
  } catch (e) {
    return res.status(500).json({ error: 'timeline failed' });
  }
});

// POST /api/day-of-coordinator/:event_id/adjust { item_id, new_time? OR delay_minutes? OR cancelled? }
router.post('/:event_id/adjust', async (req, res) => {
  try {
    const { item_id, new_time, delay_minutes, cancelled } = req.body || {};
    if (!item_id) return res.status(400).json({ error: 'item_id required' });
    if (cancelled) {
      await pool.query(`UPDATE event_timeline SET cancelled = true WHERE id = $1 AND event_id = $2`, [item_id, req.params.event_id]).catch(() => null);
      return res.json({ item_id, cancelled: true });
    }
    if (new_time) {
      await pool.query(`UPDATE event_timeline SET scheduled_at = $1 WHERE id = $2 AND event_id = $3`, [new Date(new_time), item_id, req.params.event_id]).catch(() => null);
      return res.json({ item_id, new_time });
    }
    if (delay_minutes) {
      await pool.query(`UPDATE event_timeline SET scheduled_at = scheduled_at + ($1 * INTERVAL '1 minute') WHERE id = $2 AND event_id = $3`, [Number(delay_minutes), item_id, req.params.event_id]).catch(() => null);
      return res.json({ item_id, delayed_by_minutes: Number(delay_minutes) });
    }
    return res.status(400).json({ error: 'provide new_time, delay_minutes, or cancelled' });
  } catch (e) {
    return res.status(500).json({ error: 'adjust failed' });
  }
});

module.exports = { router, setPool };
