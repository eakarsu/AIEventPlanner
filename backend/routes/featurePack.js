'use strict';
// Feature pack wave 1A: search/filter on events + CSV/JSON export.
// Tasks (POST/PUT /api/tasks) and AI already exist — not duplicated.
const { filterEvents, toCsv, toJsonExport } = require('../domain/featurePack');
const ai=require('../domain/aiFallback');

function createFeaturePackRouter(pool) {
  const router = require('express').Router();
  router.get('/events/search', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM events ORDER BY id DESC LIMIT 1000');
      const data = filterEvents(rows, req.query);
      res.json({ data, count: data.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  router.get('/events/export', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM events ORDER BY id DESC LIMIT 1000');
      const data = filterEvents(rows, req.query);
      if (String(req.query.format || 'csv').toLowerCase() === 'json') return res.json(toJsonExport(data));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="events_export.csv"');
      res.send(toCsv(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // Offline AI over own records (deterministic fallback, aiGenerated:false)
  const safe=async(sql)=>{try{const r=await pool.query(sql);return r.rows||[];}catch{return[];}};
  router.post('/ai/event-readiness',async(req,res)=>{res.json(ai.eventReadiness(await safe('SELECT * FROM events ORDER BY id DESC LIMIT 1000'),await safe('SELECT * FROM tasks ORDER BY id DESC LIMIT 1000')));});
  router.post('/ai/budget-insights',async(req,res)=>{res.json(ai.budgetInsights(await safe('SELECT * FROM budgets ORDER BY id DESC LIMIT 1000')));});
  router.post('/ai/task-prioritization',async(req,res)=>{res.json(ai.taskPrioritization(await safe('SELECT * FROM tasks ORDER BY id DESC LIMIT 1000')));});
  return router;
}
module.exports = { createFeaturePackRouter };
