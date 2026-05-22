import React, { useState } from 'react';

const card = { background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 18 };

export default function EventBriefPdf({ token }) {
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState(null);

  const generate = async () => {
    setStatus('Generating…');
    try {
      const url = `/api/custom-views/event-brief${eventId ? `?event_id=${encodeURIComponent(eventId)}` : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const t = await r.text();
        setStatus(`Error: ${t.slice(0, 200)}`);
        return;
      }
      const blob = await r.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `event-brief-${eventId || 'sample'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      setStatus(`Downloaded event-brief-${eventId || 'sample'}.pdf (${blob.size} bytes)`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div style={card} data-testid="event-brief-pdf">
      <h3 style={{ marginTop: 0 }}>Event Brief / Run-of-Show (PDF)</h3>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
        Generate a printable PDF brief: overview, schedule, tasks, vendors, contingencies.
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Event ID (optional)"
          value={eventId}
          onChange={e => setEventId(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
        />
        <button
          onClick={generate}
          style={{ padding: '8px 16px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Generate PDF
        </button>
      </div>
      {status && <div style={{ marginTop: 10, fontSize: 12, color: '#444' }}>{status}</div>}
    </div>
  );
}
