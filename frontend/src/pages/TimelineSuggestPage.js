import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function TimelineSuggestPage({ token }) {
  const [formData, setFormData] = useState({
    event_type: '',
    event_date: '',
    headcount: '',
    special_requirements: '',
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const fields = [
    { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Wedding, Conference', required: true },
    { name: 'event_date', label: 'Event Date', type: 'date', required: true },
    { name: 'headcount', label: 'Headcount', type: 'number', placeholder: '100' },
    { name: 'special_requirements', label: 'Special Requirements', type: 'textarea', placeholder: 'AV, dietary, accessibility, ...' },
  ];

  const handleSubmit = async () => {
    setError('');
    setResponse(null);

    if (!formData.event_type || !formData.event_date) {
      setError('Event type and event date are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/timeline-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const timeline = response?.timeline;

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>AI Timeline Suggest</h1>
        <p>Backwards-planning timeline with phases, tasks, and critical path.</p>
      </div>

      <div className="ai-form-card">
        <div className="ai-form-grid">
          {fields.map(f => (
            <div className="form-field" key={f.name}>
              <label>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                />
              ) : (
                <input
                  type={f.type}
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                />
              )}
            </div>
          ))}
        </div>

        <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
              Generating with AI...
            </>
          ) : (
            <>🤖 Generate Timeline</>
          )}
        </button>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="ai-response-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">AI is building your event timeline...</div>
          </div>
        </div>
      )}

      {response && !loading && timeline && (
        <div className="ai-response-card">
          <div className="ai-response-header">
            <h3><span>✨</span> Event Timeline</h3>
            <span className="ai-model-badge">{response.model || 'AI Model'}</span>
          </div>
          <div className="ai-response-body">
            {timeline.summary && <p><strong>Summary:</strong> {timeline.summary}</p>}
            <p><strong>Event date:</strong> {timeline.event_date}</p>

            {Array.isArray(timeline.phases) && timeline.phases.map((phase, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <h4>{phase.name}{typeof phase.weeks_from_event === 'number' ? ` (${phase.weeks_from_event} weeks out)` : ''}</h4>
                {Array.isArray(phase.tasks) && (
                  <ul>
                    {phase.tasks.map((t, j) => (
                      <li key={j}>
                        <strong>{t.task}</strong>
                        {t.owner ? ` — Owner: ${t.owner}` : ''}
                        {t.deadline_date ? ` — Due: ${t.deadline_date}` : ''}
                        {t.vendor_dependency ? ` — Vendor: ${t.vendor_dependency}` : ''}
                        {typeof t.estimated_hours === 'number' ? ` — Est: ${t.estimated_hours}h` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {Array.isArray(timeline.critical_path) && timeline.critical_path.length > 0 && (
              <>
                <h4>Critical Path</h4>
                <ul>{timeline.critical_path.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </>
            )}

            {Array.isArray(timeline.risks) && timeline.risks.length > 0 && (
              <>
                <h4>Risks</h4>
                <ul>{timeline.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </>
            )}

            {timeline.raw && <pre style={{ whiteSpace: 'pre-wrap' }}>{timeline.raw}</pre>}
          </div>
          {response.usage && (
            <div className="ai-usage-info">
              <span>📥 Input: {response.usage.prompt_tokens || 0} tokens</span>
              <span>📤 Output: {response.usage.completion_tokens || 0} tokens</span>
              <span>📊 Total: {response.usage.total_tokens || 0} tokens</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
