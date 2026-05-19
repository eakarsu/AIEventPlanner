// AI décor suggestions: mood board from theme + colour scheme.
const express = require('express');
const router = express.Router();
const { aiRateLimiter } = require('../middleware/rateLimiter');

let pool;
let callOpenRouter;
const setDeps = (p, fn) => { pool = p; callOpenRouter = fn; };

// POST /api/decor-suggestions/moodboard { theme, colors:[hex], venue_type? }
router.post('/moodboard', aiRateLimiter, async (req, res) => {
  try {
    const { theme, colors = [], venue_type } = req.body || {};
    if (!theme) return res.status(400).json({ error: 'theme required' });
    const system = 'Compose a décor mood board. Output JSON {"keywords":["..."],"materials":["..."],"floral":["..."],"lighting":["..."],"image_prompt":"..."}.';
    let parsed;
    try {
      const raw = await callOpenRouter(`${system}\n\nTheme: ${theme}, colours: ${colors.join(',')}, venue: ${venue_type || 'any'}`);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }
    return res.json({ theme, colors, suggestions: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'moodboard failed' });
  }
});

module.exports = { router, setDeps };
