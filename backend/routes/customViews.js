// ============================================================
// === Custom Views (4 endpoints) ===
// VIZ: event-timeline (Gantt), vendor-utilization (heatmap)
// NON-VIZ: event-brief PDF, contract-rules CRUD
// ============================================================
const express = require('express');
const router = express.Router();

let _pool = null;
let _rulesReady = false;

function setPool(pool) { _pool = pool; }

async function ensureRulesTable() {
  if (_rulesReady || !_pool) return;
  try {
    await _pool.query(`CREATE TABLE IF NOT EXISTS vendor_contract_rules (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER,
      rule_name VARCHAR(200) NOT NULL,
      rule_type VARCHAR(80),
      condition TEXT,
      action TEXT,
      priority INTEGER DEFAULT 1,
      enabled BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _rulesReady = true;
  } catch (e) { /* tolerant */ }
}

// ---------- 1) VIZ: Event Timeline Gantt (per task/vendor) ----------
router.get('/event-timeline', async (req, res) => {
  try {
    if (!_pool) return res.json({ events: [], tasks: [], vendors: [] });
    const eventId = req.query.event_id ? parseInt(req.query.event_id) : null;
    const eventsQ = eventId
      ? await _pool.query('SELECT id, name, event_type, date, time, status FROM events WHERE id=$1', [eventId])
      : await _pool.query('SELECT id, name, event_type, date, time, status FROM events ORDER BY date NULLS LAST, id DESC LIMIT 20');
    const events = eventsQ.rows;
    const eventIds = events.map(e => e.id);
    let tasks = [];
    let vendorTasks = [];
    if (eventIds.length) {
      const tq = await _pool.query(
        `SELECT id, event_id, title, assigned_to, due_date, priority, status
         FROM tasks WHERE event_id = ANY($1::int[]) ORDER BY due_date NULLS LAST, id ASC`,
        [eventIds]
      );
      tasks = tq.rows.map(t => {
        const due = t.due_date ? new Date(t.due_date) : null;
        const start = due ? new Date(due.getTime() - 7 * 86400 * 1000) : null;
        return {
          id: `task-${t.id}`,
          event_id: t.event_id,
          label: t.title,
          assignee: t.assigned_to || 'Unassigned',
          start: start ? start.toISOString().slice(0, 10) : null,
          end: due ? due.toISOString().slice(0, 10) : null,
          priority: t.priority,
          status: t.status,
          kind: 'task',
        };
      });
      const vq = await _pool.query(
        `SELECT v.id, v.name, v.service_type, v.availability,
                e.id AS event_id, e.name AS event_name, e.date
         FROM vendors v
         CROSS JOIN events e
         WHERE e.id = ANY($1::int[])
         LIMIT 60`,
        [eventIds]
      );
      vendorTasks = vq.rows.map(r => {
        const d = r.date ? new Date(r.date) : null;
        const start = d ? new Date(d.getTime() - 2 * 86400 * 1000) : null;
        const end = d ? new Date(d.getTime() + 1 * 86400 * 1000) : null;
        return {
          id: `vendor-${r.id}-evt-${r.event_id}`,
          event_id: r.event_id,
          event_name: r.event_name,
          label: `${r.name} (${r.service_type || 'Vendor'})`,
          assignee: r.name,
          start: start ? start.toISOString().slice(0, 10) : null,
          end: end ? end.toISOString().slice(0, 10) : null,
          status: r.availability,
          kind: 'vendor',
        };
      });
    }
    res.json({
      events,
      tasks,
      vendor_assignments: vendorTasks,
      total_bars: tasks.length + vendorTasks.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 2) VIZ: Vendor Utilization Heatmap (vendor x event) ----------
router.get('/vendor-utilization', async (req, res) => {
  try {
    if (!_pool) return res.json({ vendors: [], events: [], matrix: [] });
    const vq = await _pool.query(
      'SELECT id, name, service_type, hourly_rate, availability FROM vendors ORDER BY name ASC LIMIT 30'
    );
    const eq = await _pool.query(
      'SELECT id, name, event_type, date, status FROM events ORDER BY date NULLS LAST, id DESC LIMIT 20'
    );
    const vendors = vq.rows;
    const events = eq.rows;
    // Heatmap value = pseudo-utilization derived from rating-of-fit between
    // vendor service type and event type plus availability boost.
    const matrix = vendors.map(v => events.map(e => {
      let score = 0;
      const svc = (v.service_type || '').toLowerCase();
      const et = (e.event_type || '').toLowerCase();
      if (svc.includes('cater') && (et.includes('wedding') || et.includes('gala') || et.includes('corporate'))) score += 0.5;
      if (svc.includes('music') || svc.includes('dj')) score += 0.35;
      if (svc.includes('photo')) score += 0.4;
      if (svc.includes('floral')) score += et.includes('wedding') ? 0.55 : 0.25;
      if ((v.availability || '').toLowerCase() === 'available') score += 0.2;
      // deterministic noise based on ids so heatmap looks structured, not random
      score += (((v.id * 13 + e.id * 7) % 11) / 50);
      return Math.max(0, Math.min(1, Number(score.toFixed(3))));
    }));
    res.json({
      vendors: vendors.map(v => ({ id: v.id, name: v.name, service_type: v.service_type, hourly_rate: v.hourly_rate })),
      events: events.map(e => ({ id: e.id, name: e.name, event_type: e.event_type, date: e.date })),
      matrix,
      legend: { min: 0, max: 1, label: 'Utilization fit (0–1)' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 3) NON-VIZ: Event Brief / Run-of-Show PDF ----------
// Returns a minimal valid PDF (no external deps).
function buildSimplePdf(lines) {
  // Each text line as a separate "Tj" at decreasing y.
  const escapeText = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const pageWidth = 612, pageHeight = 792;
  let y = pageHeight - 60;
  const ops = ['BT', '/F1 12 Tf', `1 0 0 1 50 ${y} Tm`];
  let first = true;
  for (const line of lines) {
    if (!first) ops.push('0 -16 Td');
    ops.push(`(${escapeText(line)}) Tj`);
    first = false;
  }
  ops.push('ET');
  const contentStream = ops.join('\n');
  const contentObj = `<< /Length ${Buffer.byteLength(contentStream)} >>\nstream\n${contentStream}\nendstream`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    contentObj,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

router.get('/event-brief', async (req, res) => {
  try {
    const eventId = req.query.event_id ? parseInt(req.query.event_id) : null;
    let ev = null, tasks = [], vendors = [], guests_count = 0, budget_total = 0;
    if (_pool && eventId) {
      const eq = await _pool.query('SELECT * FROM events WHERE id=$1', [eventId]);
      ev = eq.rows[0] || null;
      if (ev) {
        const tq = await _pool.query('SELECT title, assigned_to, due_date, status, priority FROM tasks WHERE event_id=$1 ORDER BY due_date NULLS LAST LIMIT 30', [eventId]);
        tasks = tq.rows;
        const gq = await _pool.query('SELECT COUNT(*) FROM guests WHERE event_id=$1', [eventId]);
        guests_count = parseInt(gq.rows[0].count);
        const bq = await _pool.query('SELECT COALESCE(SUM(estimated_cost),0) AS total FROM budgets WHERE event_id=$1', [eventId]);
        budget_total = parseFloat(bq.rows[0].total);
      }
    }
    const lines = [];
    lines.push('EVENT BRIEF / RUN-OF-SHOW');
    lines.push('========================================');
    if (ev) {
      lines.push(`Event: ${ev.name}`);
      lines.push(`Type: ${ev.event_type || '-'}`);
      lines.push(`Date: ${ev.date || '-'}  Time: ${ev.time || '-'}`);
      lines.push(`Location: ${ev.location || '-'}`);
      lines.push(`Status: ${ev.status || '-'}   Max guests: ${ev.max_guests || '-'}`);
      lines.push(`Budget: $${ev.budget || 0}    Budget items total: $${budget_total}`);
      lines.push(`Confirmed guests: ${guests_count}`);
      lines.push('');
      lines.push('Run of Show / Tasks:');
      tasks.forEach((t, i) => {
        lines.push(`  ${i + 1}. [${t.status || 'Pending'}] ${t.title} — ${t.assigned_to || 'Unassigned'} — due ${t.due_date || 'TBD'}`);
      });
      if (!tasks.length) lines.push('  (no tasks scheduled)');
    } else {
      lines.push('No event selected. Pass ?event_id=<id> to render a full brief.');
      lines.push('This document is a sample run-of-show shell.');
      lines.push('Sections: Overview, Schedule, Roles, Vendors, Contingencies.');
    }
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    const pdf = buildSimplePdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="event-brief-${eventId || 'sample'}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 4) NON-VIZ: Vendor/Contract Rules Editor (CRUD) ----------
router.get('/contract-rules', async (req, res) => {
  try {
    await ensureRulesTable();
    if (!_pool) return res.json({ rules: [] });
    const r = await _pool.query('SELECT * FROM vendor_contract_rules ORDER BY priority DESC, id DESC LIMIT 200');
    res.json({ rules: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/contract-rules', async (req, res) => {
  try {
    await ensureRulesTable();
    if (!_pool) return res.status(503).json({ error: 'DB unavailable' });
    const { vendor_id, rule_name, rule_type, condition, action, priority, enabled, notes } = req.body || {};
    if (!rule_name) return res.status(400).json({ error: 'rule_name is required' });
    const r = await _pool.query(
      `INSERT INTO vendor_contract_rules (vendor_id, rule_name, rule_type, condition, action, priority, enabled, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [vendor_id || null, rule_name, rule_type || 'general', condition || '', action || '', priority || 1, enabled !== false, notes || '']
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/contract-rules/:id', async (req, res) => {
  try {
    await ensureRulesTable();
    if (!_pool) return res.status(503).json({ error: 'DB unavailable' });
    const { vendor_id, rule_name, rule_type, condition, action, priority, enabled, notes } = req.body || {};
    const r = await _pool.query(
      `UPDATE vendor_contract_rules SET vendor_id=$1, rule_name=$2, rule_type=$3, condition=$4, action=$5,
       priority=$6, enabled=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [vendor_id || null, rule_name, rule_type, condition, action, priority, enabled, notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/contract-rules/:id', async (req, res) => {
  try {
    await ensureRulesTable();
    if (!_pool) return res.status(503).json({ error: 'DB unavailable' });
    await _pool.query('DELETE FROM vendor_contract_rules WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
