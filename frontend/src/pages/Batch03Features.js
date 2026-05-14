// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

const FEATURES = [
  { kind: 'cfs', slug: 'cf-agentic-event-coordinator', label: 'Agentic event coordinator', desc: 'NL brief → venues, vendors, timeline, budget breakdown', endpoint: '/cf-agentic-event-coordinator' },
  { kind: 'cfs', slug: 'cf-ai-d-cor-suggestions', label: 'AI décor suggestions', desc: 'Mood board from theme + colour scheme', endpoint: '/cf-ai-d-cor-suggestions' },
  { kind: 'cfs', slug: 'cf-real-time-guest-manager', label: 'Real-time guest manager', desc: 'Live RSVP/dietary/plus-one tracking', endpoint: '/cf-real-time-guest-manager' },
  { kind: 'cfs', slug: 'cf-vendor-marketplace', label: 'Vendor marketplace', desc: 'Integrated directory with reviews + availability', endpoint: '/cf-vendor-marketplace' },
  { kind: 'cfs', slug: 'cf-day-of-mobile-coordinator', label: 'Day-of mobile coordinator', desc: 'On-site timeline adjustments', endpoint: '/cf-day-of-mobile-coordinator' },
  { kind: 'cfs', slug: 'cf-post-event-analytics', label: 'Post-event analytics', desc: 'Feedback + vendor performance + budget variance', endpoint: '/cf-post-event-analytics' },
  { kind: 'cfs', slug: 'cf-hybrid-event-integration', label: 'Hybrid-event integration', desc: 'In-person + streaming overlay', endpoint: '/cf-hybrid-event-integration' },
  { kind: 'gap-ai', slug: 'gap-ai-no-image-vision-d-cor-analysis', label: 'No image-vision décor analysis', desc: 'No image-vision décor analysis', endpoint: '/gap-no-image-vision-d-cor-analysis' },
  { kind: 'gap-ai', slug: 'gap-ai-no-live-streaming-quality-monitor', label: 'No live streaming-quality monitor', desc: 'No live streaming-quality monitor', endpoint: '/gap-no-live-streaming-quality-monitor' },
  { kind: 'gap-ai', slug: 'gap-ai-no-virtual-event-hybrid-orchestration', label: 'No virtual-event hybrid orchestration', desc: 'No virtual-event hybrid orchestration', endpoint: '/gap-no-virtual-event-hybrid-orchestration' },
  { kind: 'gap-non', slug: 'gap-non-no-webhooks', label: 'No webhooks', desc: 'No webhooks', endpoint: '/gap-no-webhooks' },
  { kind: 'gap-non', slug: 'gap-non-no-file-upload-endpoint-surfaced-invitations-pdf-contracts', label: 'No file-upload endpoint surfaced (invitations PDF, contracts', desc: 'No file-upload endpoint surfaced (invitations PDF, contracts)', endpoint: '/gap-no-file-upload-endpoint-surfaced-invitations-pdf-contracts' },
  { kind: 'gap-non', slug: 'gap-non-limited-messaging-between-planner-vendors-guests', label: 'Limited messaging between planner / vendors / guests', desc: 'Limited messaging between planner / vendors / guests', endpoint: '/gap-limited-messaging-between-planner-vendors-guests' },
  { kind: 'gap-non', slug: 'gap-non-no-multi-currency-for-international-events', label: 'No multi-currency for international events', desc: 'No multi-currency for international events', endpoint: '/gap-no-multi-currency-for-international-events' },
  { kind: 'gap-non', slug: 'gap-non-no-search-endpoint-observed', label: 'No search endpoint observed', desc: 'No search endpoint observed', endpoint: '/gap-no-search-endpoint-observed' },
];

function authHeaders() {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  async function run() {
    if (!current) return;
    setLoading(true); setError(null);
    try {
      let parsed;
      try { parsed = input ? JSON.parse(input) : {}; } catch { parsed = { input }; }
      const r = await fetch(`${API_BASE}${current.endpoint}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(parsed)
      });
      let body; try { body = await r.json(); } catch { body = { raw: await r.text() }; }
      if (!r.ok) setError(body.error || `HTTP ${r.status}`);
      setResults(prev => ({ ...prev, [current.slug]: body }));
    } catch (e) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIEventPlanner)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Audit-driven AI counterparts, non-AI feature gaps, and custom feature suggestions.
        Backend endpoints prefixed <code>/api/cf-*</code> (custom features) and <code>/api/gap-*</code> (gap fills).
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => setActive(f.slug)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                     background: active === f.slug ? '#1e40af' : '#f8fafc',
                     color: active === f.slug ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 12 }}>
            <span style={{ opacity: 0.7, marginRight: 4 }}>[{f.kind}]</span>{f.label}
          </button>
        ))}
      </div>
      {current && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{current.label}</strong>
            <div style={{ color: '#475569', fontSize: 13 }}>{current.desc}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>POST <code>{current.endpoint}</code></div>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={run} disabled={loading}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
          {results[current.slug] && (
            <pre style={{ marginTop: 12, padding: 10, background: '#0b1020', color: '#cbd5e1', borderRadius: 4, overflow: 'auto', maxHeight: 360, fontSize: 12 }}>
              {typeof results[current.slug] === 'string' ? results[current.slug] : JSON.stringify(results[current.slug], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
