// Agentic event coordinator: NL brief → venues, vendors, timeline, budget.
const express = require('express');
const router = express.Router();
const { aiRateLimiter } = require('../middleware/rateLimiter');

let pool;
let callOpenRouter;
const setDeps = (p, fn) => { pool = p; callOpenRouter = fn; };

// POST /api/agentic-event-coordinator/plan { brief, attendees, budget }
router.post('/plan', aiRateLimiter, async (req, res) => {
  try {
    const { brief, attendees, budget } = req.body || {};
    if (!brief) return res.status(400).json({ error: 'brief required' });
    const venues = await pool.query(`SELECT id, name, capacity, daily_rate FROM venues LIMIT 20`).catch(() => ({ rows: [] }));
    const vendors = await pool.query(`SELECT id, name, category, daily_rate FROM vendors LIMIT 50`).catch(() => ({ rows: [] }));
    const system = 'Plan an event from the brief. Output JSON {"venues":[ids],"vendors":[ids],"timeline":[{"hour":int,"action":"..."}],"budget_breakdown":{"venue":n,"vendors":n,"f_and_b":n,"contingency":n}}.';
    const ctx = `Brief: ${brief}\nAttendees: ${attendees}\nBudget: ${budget}\nVenues: ${JSON.stringify(venues.rows)}\nVendors: ${JSON.stringify(vendors.rows).slice(0, 2500)}`;
    let parsed;
    try {
      const raw = await callOpenRouter(`${system}\n\n${ctx}`);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }
    return res.json({ brief, plan: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'plan failed' });
  }
});

module.exports = { router, setDeps };
