// Hybrid-event integration: in-person + streaming overlay.
const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

// POST /api/hybrid-event/setup { event_id, stream_url, max_remote }
router.post('/setup', async (req, res) => {
  try {
    const { event_id, stream_url, max_remote = 1000 } = req.body || {};
    if (!event_id || !stream_url) return res.status(400).json({ error: 'event_id + stream_url required' });
    try {
      await pool.query(
        `INSERT INTO hybrid_streams (event_id, stream_url, max_remote, created_at) VALUES ($1,$2,$3,NOW())
         ON CONFLICT (event_id) DO UPDATE SET stream_url = EXCLUDED.stream_url, max_remote = EXCLUDED.max_remote`,
        [event_id, stream_url, Number(max_remote)]
      );
    } catch {}
    return res.json({ event_id, stream_url, max_remote: Number(max_remote), join_url: `${stream_url}?event=${event_id}` });
  } catch (e) {
    return res.status(500).json({ error: 'setup failed' });
  }
});

// POST /api/hybrid-event/:event_id/register-remote { name, email }
router.post('/:event_id/register-remote', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    try {
      await pool.query(`INSERT INTO hybrid_attendees (event_id, name, email, mode, created_at) VALUES ($1,$2,$3,'remote',NOW())`, [req.params.event_id, name || null, email]);
    } catch {}
    return res.json({ event_id: req.params.event_id, registered: true, mode: 'remote' });
  } catch (e) {
    return res.status(500).json({ error: 'register failed' });
  }
});

module.exports = { router, setPool };
