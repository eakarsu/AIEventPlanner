import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function parseAIResponse(text) {
  if (!text) return '';

  // Convert markdown-style formatting to HTML
  let html = text
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Numbered lists
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>')
    // Bullet lists
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr/>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*(?:<br\/>)?)+)/g, '<ul>$1</ul>');

  // Clean up <br/> inside <ul>
  html = html.replace(/<ul>(.*?)<\/ul>/gs, (match) => {
    return match.replace(/<br\/>/g, '');
  });

  return `<p>${html}</p>`;
}

export default function AIPage({ token, endpoint, title, fields }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResponse(null);
    try {
      const res = await fetch(`${API}/api/${endpoint}`, {
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

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>Get AI-powered insights and recommendations for your event planning.</p>
      </div>

      <div className="ai-form-card">
        <div className="ai-form-grid">
          {fields.map(f => (
            <div className="form-field" key={f.name}>
              <label>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                />
              ) : f.type === 'select' ? (
                <select
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
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

        <button
          className="ai-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
              Generating with AI...
            </>
          ) : (
            <>🤖 Generate with AI</>
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
            <div className="loading-text">AI is thinking... This may take a moment.</div>
          </div>
        </div>
      )}

      {response && !loading && (
        <div className="ai-response-card">
          <div className="ai-response-header">
            <h3>
              <span>✨</span> AI Response
            </h3>
            <span className="ai-model-badge">{response.model || 'AI Model'}</span>
          </div>
          <div className="ai-response-body">
            <div
              className="ai-response-content"
              dangerouslySetInnerHTML={{ __html: parseAIResponse(response.result) }}
            />
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
