import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Generic event-id-based AI action page for the three pass-2 endpoints
 * that consume an existing event's data:
 *   - /api/ai/seating-optimizer
 *   - /api/ai/budget-variance
 *   - /api/ai/post-event-summary
 */
export default function EventActionPage({ token, endpoint, title, description }) {
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setResponse(null);
    if (!eventId) {
      setError('Event ID is required.');
      return;
    }

    setLoading(true);
    try {
      const tokenVal = token || localStorage.getItem('token');
      const res = await fetch(`${API}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVal}` },
        body: JSON.stringify({ event_id: parseInt(eventId, 10) }),
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

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="ai-form-card">
        <div className="ai-form-grid">
          <div className="form-field">
            <label>Event ID *</label>
            <input
              type="number"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Enter the numeric event id"
            />
          </div>
        </div>

        <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
              Generating with AI...
            </>
          ) : (
            <>🤖 Run AI Analysis</>
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
            <div className="loading-text">AI is analyzing your event data...</div>
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
            {typeof response.result === 'string' ? (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{response.result}</pre>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(response, null, 2)}</pre>
            )}
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
