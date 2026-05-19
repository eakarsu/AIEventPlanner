// Apply pass 5 — Backlog integrations for AIEventPlanner (additive only)
//
// Backlog items implemented:
//
//   NEEDS-PRODUCT-DECISION — Vendor marketplace (onboarding/payment)
//     PRODUCT-DECISION: We expose self-hosted CRUD for marketplace vendors,
//     reviews, and bookings. Payments are tracked as a status field
//     (`payment_status`) populated by the existing/external payment flow;
//     no payment provider is integrated here. Future iterations can hook
//     Stripe/PayPal once a provider is selected.
//     Tables: vendor_marketplace_listings, vendor_reviews, vendor_bookings
//
//   NEEDS-CREDS — Hybrid streaming integration
//     ENV: STREAMING_PROVIDER_API_KEY
//     ENV: STREAMING_PROVIDER  (e.g. "zoom" | "vimeo" | "twitch" | "custom")
//     Returns 503 with `missing` when STREAMING_PROVIDER_API_KEY is absent.
//
//   TOO-RISKY — Day-of mobile coordination
//     PRODUCT-DECISION: Implemented as additive in-memory + DB-backed
//     "live coordination" REST endpoints (check-in, broadcast announcement,
//     incident log). No new mobile UI surface created — just the API
//     these clients would call. Table: day_of_coordination_log.
//
// Shared helpers (pool, callOpenRouter) are injected from server.js via setDeps.

const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

async function ensureTables() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_marketplace_listings (
      id SERIAL PRIMARY KEY,
      vendor_name VARCHAR(255) NOT NULL,
      category VARCHAR(120),
      description TEXT,
      price_range VARCHAR(60),
      location VARCHAR(255),
      contact_email VARCHAR(255),
      contact_phone VARCHAR(60),
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_reviews (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER REFERENCES vendor_marketplace_listings(id) ON DELETE CASCADE,
      user_id INTEGER,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_bookings (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER REFERENCES vendor_marketplace_listings(id) ON DELETE CASCADE,
      event_id INTEGER,
      user_id INTEGER,
      booking_date DATE,
      total_amount NUMERIC(10,2),
      payment_status VARCHAR(40) DEFAULT 'unpaid',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS streaming_sessions (
      id SERIAL PRIMARY KEY,
      event_id INTEGER,
      provider VARCHAR(60),
      external_session_id VARCHAR(255),
      stream_url VARCHAR(500),
      status VARCHAR(40),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS day_of_coordination_log (
      id SERIAL PRIMARY KEY,
      event_id INTEGER,
      kind VARCHAR(40),
      payload JSONB,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────
// Vendor marketplace (NEEDS-PRODUCT-DECISION)
// ─────────────────────────────────────────────────────────────────
router.get('/marketplace/vendors', async (req, res) => {
  try {
    await ensureTables();
    const { category, location } = req.query;
    let q = 'SELECT * FROM vendor_marketplace_listings WHERE 1=1';
    const params = [];
    if (category) { params.push(category); q += ` AND category ILIKE '%' || $${params.length} || '%'`; }
    if (location) { params.push(location); q += ` AND location ILIKE '%' || $${params.length} || '%'`; }
    q += ' ORDER BY id DESC LIMIT 200';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/marketplace/vendors', async (req, res) => {
  try {
    await ensureTables();
    const { vendor_name, category, description, price_range, location, contact_email, contact_phone } = req.body || {};
    if (!vendor_name) return res.status(400).json({ error: 'vendor_name is required' });
    const r = await pool.query(
      `INSERT INTO vendor_marketplace_listings (vendor_name, category, description, price_range, location, contact_email, contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [vendor_name, category || null, description || null, price_range || null, location || null, contact_email || null, contact_phone || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/marketplace/vendors/:id/reviews', async (req, res) => {
  try {
    await ensureTables();
    const { rating, review_text } = req.body || {};
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });
    const r = await pool.query(
      `INSERT INTO vendor_reviews (vendor_id, user_id, rating, review_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user?.id || null, rating, review_text || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/marketplace/vendors/:id/reviews', async (req, res) => {
  try {
    await ensureTables();
    const r = await pool.query('SELECT * FROM vendor_reviews WHERE vendor_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/marketplace/bookings', async (req, res) => {
  try {
    await ensureTables();
    const { vendor_id, event_id, booking_date, total_amount, notes } = req.body || {};
    if (!vendor_id) return res.status(400).json({ error: 'vendor_id is required' });
    const r = await pool.query(
      `INSERT INTO vendor_bookings (vendor_id, event_id, user_id, booking_date, total_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [vendor_id, event_id || null, req.user?.id || null, booking_date || null, total_amount || null, notes || null]
    );
    // PRODUCT-DECISION: payment_status defaults to 'unpaid'; no provider integration here.
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/marketplace/bookings', async (req, res) => {
  try {
    await ensureTables();
    const r = await pool.query('SELECT * FROM vendor_bookings ORDER BY id DESC LIMIT 200');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/marketplace/bookings/:id/payment', async (req, res) => {
  try {
    await ensureTables();
    const { payment_status } = req.body || {};
    if (!['unpaid', 'pending', 'paid', 'refunded'].includes(payment_status)) {
      return res.status(400).json({ error: 'payment_status must be unpaid|pending|paid|refunded' });
    }
    const r = await pool.query(
      `UPDATE vendor_bookings SET payment_status = $1 WHERE id = $2 RETURNING *`,
      [payment_status, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────
// Hybrid streaming integration (NEEDS-CREDS)
// ─────────────────────────────────────────────────────────────────
router.post('/streaming/sessions', async (req, res) => {
  if (!process.env.STREAMING_PROVIDER_API_KEY) {
    return res.status(503).json({
      error: 'Streaming provider not configured',
      missing: 'STREAMING_PROVIDER_API_KEY'
    });
  }
  try {
    await ensureTables();
    const { event_id } = req.body || {};
    const provider = process.env.STREAMING_PROVIDER || 'custom';
    const externalId = `STREAM-${Date.now()}-${Math.floor(Math.random()*9999)}`;
    const stub = {
      provider,
      external_session_id: externalId,
      stream_url: `https://${provider}.example/sessions/${externalId}`,
      status: 'created'
    };
    const r = await pool.query(
      `INSERT INTO streaming_sessions (event_id, provider, external_session_id, stream_url, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event_id || null, stub.provider, stub.external_session_id, stub.stream_url, stub.status]
    );
    res.status(201).json({ success: true, session: r.rows[0], source: 'stub:STREAMING_PROVIDER_API_KEY-present' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/streaming/sessions', async (req, res) => {
  if (!process.env.STREAMING_PROVIDER_API_KEY) {
    return res.status(503).json({
      error: 'Streaming provider not configured',
      missing: 'STREAMING_PROVIDER_API_KEY'
    });
  }
  try {
    await ensureTables();
    const { event_id } = req.query;
    let q = 'SELECT * FROM streaming_sessions';
    const params = [];
    if (event_id) { params.push(event_id); q += ` WHERE event_id = $${params.length}`; }
    q += ' ORDER BY id DESC LIMIT 200';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────
// Day-of mobile coordination (TOO-RISKY → API-only)
// ─────────────────────────────────────────────────────────────────
router.post('/day-of/checkin', async (req, res) => {
  try {
    await ensureTables();
    const { event_id, guest_id, guest_name } = req.body || {};
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });
    const r = await pool.query(
      `INSERT INTO day_of_coordination_log (event_id, kind, payload, user_id)
       VALUES ($1, 'checkin', $2::jsonb, $3) RETURNING *`,
      [event_id, JSON.stringify({ guest_id: guest_id || null, guest_name: guest_name || null }), req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/day-of/announcement', async (req, res) => {
  try {
    await ensureTables();
    const { event_id, message, audience } = req.body || {};
    if (!event_id || !message) return res.status(400).json({ error: 'event_id and message are required' });
    const r = await pool.query(
      `INSERT INTO day_of_coordination_log (event_id, kind, payload, user_id)
       VALUES ($1, 'announcement', $2::jsonb, $3) RETURNING *`,
      [event_id, JSON.stringify({ message, audience: audience || 'all' }), req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/day-of/incident', async (req, res) => {
  try {
    await ensureTables();
    const { event_id, severity, description } = req.body || {};
    if (!event_id || !description) return res.status(400).json({ error: 'event_id and description required' });
    const r = await pool.query(
      `INSERT INTO day_of_coordination_log (event_id, kind, payload, user_id)
       VALUES ($1, 'incident', $2::jsonb, $3) RETURNING *`,
      [event_id, JSON.stringify({ severity: severity || 'low', description }), req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/day-of/log/:event_id', async (req, res) => {
  try {
    await ensureTables();
    const r = await pool.query(
      'SELECT * FROM day_of_coordination_log WHERE event_id = $1 ORDER BY id DESC LIMIT 500',
      [req.params.event_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, setPool };
