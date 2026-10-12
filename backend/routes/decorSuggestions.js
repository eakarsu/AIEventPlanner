// AI décor suggestions: mood board from theme + colour scheme.
const express = require('express');
const router = express.Router();
const { aiRateLimiter } = require('../middleware/rateLimiter');

let pool;
let callOpenRouter;
const setDeps = (p, fn) => { pool = p; callOpenRouter = fn; };

// POST /api/decor-suggestions/moodboard { theme, colors:[hex], venue_type? }
router.post('/moodboard', aiRateLimiter, async (req, res) => {
  const controller = new AbortController(), abort = () => { if (!res.writableEnded) controller.abort(); };
  req.once('aborted', abort); res.once('close', abort); if (req.aborted || res.destroyed) controller.abort();
  try {
    controller.signal.throwIfAborted();
    const { theme, colors = [], venue_type } = req.body || {};
    if (!theme) return res.status(400).json({ error: 'theme required' });
    if (!Array.isArray(colors) || colors.some(color => typeof color !== 'string')) return res.status(400).json({ error: 'colors must be an array of color strings' });
    const system = 'Compose a décor mood board. Output JSON {"keywords":["..."],"materials":["..."],"floral":["..."],"lighting":["..."],"image_prompt":"..."}.';
    let parsed;
    try {
      const completion = await callOpenRouter(`${system}\n\nTheme: ${theme}, colours: ${colors.join(',')}, venue: ${venue_type || 'any'}`, { signal: controller.signal });
      controller.signal.throwIfAborted();
      const raw = typeof completion === 'string' ? completion : completion?.choices?.[0]?.message?.content;
      if (!raw) throw new Error('OpenRouter returned no report content');
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { report: raw }; }
    } catch (e) {
      if (controller.signal.aborted || res.destroyed) return;
      return res.status(503).json({ error: 'LLM unavailable' });
    }
    return res.json({ theme, colors, suggestions: parsed });
  } catch (e) {
    if (controller.signal.aborted || res.destroyed) return;
    return res.status(500).json({ error: 'moodboard failed' });
  } finally { req.off('aborted', abort); res.off('close', abort); }
});

module.exports = { router, setDeps };
