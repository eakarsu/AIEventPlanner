import React, { useEffect, useState } from 'react';

const card = { background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 18 };

function color(v) {
  const t = Math.max(0, Math.min(1, v));
  const r = Math.round(255 * (1 - t) + 21 * t);
  const g = Math.round(245 * (1 - t) + 101 * t);
  const b = Math.round(235 * (1 - t) + 192 * t);
  return `rgb(${r},${g},${b})`;
}

export default function VendorUtilizationHeatmap({ token }) {
  const [data, setData] = useState({ vendors: [], events: [], matrix: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch('/api/custom-views/vendor-utilization', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [token]);

  if (loading) return <div style={card}>Loading heatmap…</div>;
  if (err) return <div style={card}>Error: {err}</div>;
  if (!data.vendors?.length || !data.events?.length) {
    return <div style={card}>No vendor or event data available.</div>;
  }

  return (
    <div style={card} data-testid="vendor-utilization-heatmap">
      <h3 style={{ marginTop: 0 }}>Vendor Utilization Heatmap</h3>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        Rows: vendors ({data.vendors.length}) — Columns: events ({data.events.length}). Darker = higher fit/utilization.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fafafa', padding: '4px 8px', textAlign: 'left', border: '1px solid #eee' }}>Vendor \\ Event</th>
              {data.events.map(e => (
                <th key={e.id} style={{ padding: '4px 6px', border: '1px solid #eee', whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.name}>
                  {e.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.vendors.map((v, i) => (
              <tr key={v.id}>
                <td style={{ position: 'sticky', left: 0, background: '#fafafa', padding: '4px 8px', border: '1px solid #eee', whiteSpace: 'nowrap' }}>
                  {v.name} <span style={{ color: '#999' }}>· {v.service_type}</span>
                </td>
                {data.matrix[i]?.map((val, j) => (
                  <td key={j} style={{ padding: 0, border: '1px solid #eee', background: color(val), width: 36, height: 24, textAlign: 'center', color: val > 0.6 ? '#fff' : '#333' }} title={`${val}`}>
                    {val.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
