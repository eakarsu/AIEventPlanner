// Vendor marketplace: integrated directory with reviews + availability.
const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

// GET /api/vendor-marketplace/search?category=&min_rating=&available_on=YYYY-MM-DD
router.get('/search', async (req, res) => {
  try {
    const { category, min_rating, available_on } = req.query;
    const where = [];
    const params = [];
    let i = 1;
    if (category) { where.push(`category = $${i++}`); params.push(category); }
    if (min_rating) { where.push(`rating >= $${i++}`); params.push(Number(min_rating)); }
    const sql = `SELECT id, name, category, rating, daily_rate FROM vendors ${where.length ? 'WHERE ' + where.join(' AND ') : ''} LIMIT 50`;
    const vendors = await pool.query(sql, params).catch(() => ({ rows: [] }));
    let availableIds = vendors.rows.map(v => v.id);
    if (available_on) {
      try {
        const busy = await pool.query(`SELECT DISTINCT vendor_id FROM vendor_bookings WHERE vendor_id = ANY($1) AND $2::date BETWEEN start_date AND end_date`, [availableIds, available_on]);
        const busySet = new Set(busy.rows.map(r => r.vendor_id));
        availableIds = availableIds.filter(id => !busySet.has(id));
      } catch {}
    }
    return res.json({ count: vendors.rows.length, available_on: available_on || null, vendors: vendors.rows.filter(v => availableIds.includes(v.id)) });
  } catch (e) {
    return res.status(500).json({ error: 'search failed' });
  }
});

module.exports = { router, setPool };
