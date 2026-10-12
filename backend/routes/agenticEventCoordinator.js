// Agentic event coordinator: NL brief → venues, vendors, timeline, budget.
const express = require('express');
const router = express.Router();
const { aiRateLimiter } = require('../middleware/rateLimiter');

let pool;
let callOpenRouter;
const setDeps = (p, fn) => { pool = p; callOpenRouter = fn; };

// POST /api/agentic-event-coordinator/plan { brief, attendees, budget }
router.post('/plan', aiRateLimiter, async (req, res) => {
  const controller = new AbortController(), abort = () => { if (!res.writableEnded) controller.abort(); };
  req.once('aborted', abort); res.once('close', abort); if (req.aborted || res.destroyed) controller.abort();
  try {
    controller.signal.throwIfAborted();
    const { brief, attendees, budget } = req.body || {};
    if (!brief) return res.status(400).json({ error: 'brief required' });
    const venues = await pool.query(`SELECT id, name, capacity, hourly_rate, venue_type FROM venues ORDER BY id LIMIT 20`);
    const vendors = await pool.query(`SELECT id, name, service_type, hourly_rate FROM vendors ORDER BY id LIMIT 50`);
    controller.signal.throwIfAborted();
    const system = 'Plan an event from the brief. Output JSON {"venues":[ids],"vendors":[ids],"timeline":[{"hour":int,"action":"..."}],"budget_breakdown":{"venue":n,"vendors":n,"f_and_b":n,"contingency":n}}.';
    const ctx = `Brief: ${brief}\nAttendees: ${attendees}\nBudget: ${budget}\nVenues: ${JSON.stringify(venues.rows)}\nVendors: ${JSON.stringify(vendors.rows).slice(0, 2500)}`;
    let parsed;
    try {
      const completion = await callOpenRouter(`${system}\n\n${ctx}`, { signal: controller.signal });
      controller.signal.throwIfAborted();
      const raw = typeof completion === 'string' ? completion : completion?.choices?.[0]?.message?.content;
      if (!raw) throw new Error('OpenRouter returned no report content');
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { report: raw }; }
    } catch (e) {
      if (controller.signal.aborted || res.destroyed) return;
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }
    return res.json({ brief, plan: parsed });
  } catch (e) {
    if (controller.signal.aborted || res.destroyed) return;
    return res.status(500).json({ error: 'plan failed' });
  } finally { req.off('aborted', abort); res.off('close', abort); }
});

module.exports = { router, setDeps };
