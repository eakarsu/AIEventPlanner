// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';


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


export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);

  const sampleRequests = [
      {
          "label": "Scenario",
          "value": "Run Batch03 Features for a realistic customer case.\nContext: a team needs a practical recommendation based on incomplete operating data.\nGoal: identify the best action, key risks, missing information, and expected business impact.\nReturn: summary, prioritized action plan, assumptions, and follow-up questions."
      },
      {
          "label": "Data sample",
          "value": "Analyze this Batch03 Features data sample.\nInput records:\n- Record 1: urgent, customer impact high, owner unassigned\n- Record 2: medium priority, blocked by missing data\n- Record 3: recurring issue, automation opportunity\nReturn structured findings, anomalies, recommendations, and confidence."
      },
      {
          "label": "Executive review",
          "value": "Prepare an executive review for Batch03 Features.\nAudience: business owner, operations lead, and implementation team.\nInclude impact, risk, estimated effort, decision points, and a concise next-step plan."
      }
  ];

  const applySampleRequest = (value) => {
    setInput(`${current.label} — illustrative capability draft.\n${current.desc}\n${value}`);
    setError(null);
  };
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIEventPlanner)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        These prototype actions are unavailable. Draft examples do not execute an AI tool, book suppliers or change event records.
        Use the supported <a href="/ai/agentic-coordinator">Event Coordinator</a> and <a href="/ai/decor-moodboard">Décor Moodboard</a> workspaces to generate an AI draft.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => { setActive(f.slug); setInput(`${f.label} — illustrative capability draft.\n${f.desc}\n${sampleRequests[0].value}`); setError(null); }}
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
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>Unavailable prototype action</div>
          </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {sampleRequests.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleRequest(sample.value)}
              style={{ padding: '6px 10px', background: '#eef2ff', color: '#1e3a8a', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {sample.label}
            </button>
          ))}
        </div>

          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button type="button" disabled
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: 0.6 }}>
              Generate unavailable
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
        </div>
      )}
    </div>
  );
}
