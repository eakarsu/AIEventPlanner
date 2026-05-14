// Post-event analytics: feedback + vendor performance + budget variance.
const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

// GET /api/post-event-analytics/:event_id
router.get('/:event_id', async (req, res) => {
  try {
    const feedback = await pool.query(`SELECT AVG(rating) AS avg_rating, COUNT(*) AS n FROM event_feedback WHERE event_id = $1`, [req.params.event_id]).catch(() => ({ rows: [{}] }));
    const vendors = await pool.query(`SELECT vendor_id, AVG(rating) AS rating, COUNT(*) AS n FROM vendor_feedback WHERE event_id = $1 GROUP BY vendor_id`, [req.params.event_id]).catch(() => ({ rows: [] }));
    const budget = await pool.query(`SELECT category, SUM(planned) as planned, SUM(actual) as actual FROM budgets WHERE event_id = $1 GROUP BY category`, [req.params.event_id]).catch(() => ({ rows: [] }));
    return res.json({
      event_id: req.params.event_id,
      feedback: feedback.rows[0],
      vendor_performance: vendors.rows,
      budget_variance: budget.rows.map(b => ({ category: b.category, planned: Number(b.planned), actual: Number(b.actual), variance: Number(b.actual) - Number(b.planned) })),
    });
  } catch (e) {
    return res.status(500).json({ error: 'analytics failed' });
  }
});

module.exports = { router, setPool };
