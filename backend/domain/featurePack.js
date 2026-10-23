'use strict';
// Feature pack wave 1A — pure helpers for the missing core behaviours.
// Tasks and AI already exist in backend/server.js, so only search/filter
// on the main record list (events) and CSV/JSON export live here.
const EVENT_COLUMNS = ['id', 'name', 'event_type', 'status', 'event_date', 'budget'];

function filterEvents(records, filters = {}) {
  const list = Array.isArray(records) ? records : [];
  const q = String(filters.search || '').trim().toLowerCase();
  const status = String(filters.status || '').trim().toLowerCase();
  const type = String(filters.event_type || filters.type || '').trim().toLowerCase();
  return list.filter((r) => {
    if (status && String(r.status || '').toLowerCase() !== status) return false;
    if (type && String(r.event_type || '').toLowerCase() !== type) return false;
    if (q) {
      const hay = `${r.name || ''} ${r.event_type || ''} ${r.status || ''} ${r.location || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(records, columns = EVENT_COLUMNS) {
  const list = Array.isArray(records) ? records : [];
  return [columns.join(','), ...list.map((r) => columns.map((c) => csvEscape(r[c])).join(','))].join('\n');
}
function toJsonExport(records) {
  return { exported_at: new Date().toISOString(), count: (records || []).length, data: records || [] };
}
module.exports = { EVENT_COLUMNS, filterEvents, toCsv, toJsonExport };
