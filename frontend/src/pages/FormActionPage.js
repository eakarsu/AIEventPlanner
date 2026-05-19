import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Generic form-driven AI action page for free-form AI endpoints
 * (no event_id binding). Used by:
 *   - /api/ai/menu-recommend
 *   - /api/ai/vendor-recommend
 *   - /api/ai/guest-list-optimize
 *
 * Props:
 *   token:        JWT (falls back to localStorage)
 *   endpoint:     api path under /api (e.g. "ai/menu-recommend")
 *   title:        page title
 *   description:  page subtitle
 *   fields:       array of { name, label, type, placeholder?, required?, options? }
 *   resultKey:    optional key on the response holding the structured result (e.g. "menu")
 */
export default function FormActionPage({ token, endpoint, title, description, fields, resultKey }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setResponse(null);

    const missing = (fields || []).filter(f => f.required && !formData[f.name]);
    if (missing.length > 0) {
      setError(`Required: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const tokenVal = token || localStorage.getItem('token');
      // Support fields declared with type: 'json' — parse into JS values before send
      const payload = { ...formData };
      for (const f of fields || []) {
        if (f.type === 'json' && payload[f.name]) {
          try { payload[f.name] = JSON.parse(payload[f.name]); }
          catch (e) {
            setLoading(false);
            setError(`${f.label}: invalid JSON — ${e.message}`);
            return;
          }
        }
        if (f.type === 'number' && payload[f.name] !== undefined && payload[f.name] !== '') {
          const n = Number(payload[f.name]);
          if (!Number.isNaN(n)) payload[f.name] = n;
        }
      }
      const res = await fetch(`${API}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVal}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 503) {
        throw new Error(data.error || 'AI service unavailable — OPENROUTER_API_KEY may be missing on the server.');
      }
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const result = resultKey && response ? response[resultKey] : null;

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="ai-form-card">
        <div className="ai-form-grid">
          {(fields || []).map(f => (
            <div className="form-field" key={f.name}>
              <label>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' || f.type === 'json' ? (
                <textarea
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                  style={f.type === 'json' ? { fontFamily: 'monospace', fontSize: 13 } : undefined}
                />
              ) : f.type === 'select' && Array.isArray(f.options) ? (
                <select
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                >
                  <option value="">-- select --</option>
                  {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
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
            <>🤖 Run AI</>
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
            <div className="loading-text">AI is thinking...</div>
          </div>
        </div>
      )}

      {response && !loading && (
        <div className="ai-response-card">
          <div className="ai-response-header">
            <h3><span>✨</span> AI Result</h3>
            <span className="ai-model-badge">{response.model || 'AI Model'}</span>
          </div>
          <div className="ai-response-body">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {JSON.stringify(result || response, null, 2)}
            </pre>
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
