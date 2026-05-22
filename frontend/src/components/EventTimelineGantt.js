import React, { useEffect, useState } from 'react';

const card = { background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 18 };

export default function EventTimelineGantt({ token }) {
  const [data, setData] = useState({ events: [], tasks: [], vendor_assignments: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch('/api/custom-views/event-timeline', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [token]);

  if (loading) return <div style={card}>Loading timeline…</div>;
  if (err) return <div style={card}>Error: {err}</div>;

  const all = [...(data.tasks || []), ...(data.vendor_assignments || [])].filter(b => b.start && b.end);
  if (!all.length) return <div style={card} data-testid="gantt-empty">No timeline bars to display.</div>;
  const dates = all.map(b => new Date(b.start).getTime()).concat(all.map(b => new Date(b.end).getTime()));
  const minT = Math.min(...dates);
  const maxT = Math.max(...dates);
  const span = Math.max(1, maxT - minT);

  return (
    <div style={card} data-testid="event-timeline-gantt">
      <h3 style={{ marginTop: 0 }}>Event Timeline (Gantt)</h3>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        {all.length} bars across {data.events?.length || 0} event(s). Tasks (blue) & Vendor assignments (green).
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {all.slice(0, 40).map(bar => {
          const s = new Date(bar.start).getTime();
          const e = new Date(bar.end).getTime();
          const left = ((s - minT) / span) * 100;
          const width = Math.max(2, ((e - s) / span) * 100);
          const color = bar.kind === 'vendor' ? '#2e7d32' : '#1565c0';
          return (
            <div key={bar.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 220, fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bar.label} <span style={{ color: '#999' }}>· {bar.assignee}</span>
              </div>
              <div style={{ position: 'relative', flex: 1, height: 18, background: '#f1f3f5', borderRadius: 4 }}>
                <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: color, borderRadius: 4, opacity: 0.85 }} />
              </div>
              <div style={{ width: 150, fontSize: 11, color: '#666' }}>{bar.start} → {bar.end}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
