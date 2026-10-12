import AIFieldPresets, { completeExample } from './AIFieldPresets';
import AIResultView from './AIResultView';
import useCancelableAI from './useCancelableAI';
import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';



export default function AIPage({ token, endpoint, title, fields }) {
  const [formData, setFormData] = useState({});
  const aiRequest = useCancelableAI();
  const { loading, result: response, setResult: setResponse, error, setError: setError } = aiRequest;



  const handleSubmit = async (event) => { event?.preventDefault?.(); return aiRequest.run(async (options) => { const res = await fetch(`${API}/api/${endpoint}`, { ...options, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(formData) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'AI request failed'); return data; }); };

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>Get AI-powered insights and recommendations for your event planning.</p>
      </div>

      <div className="ai-form-card">
          <AIFieldPresets fields={fields} samples={[]} context={title} disabled={loading} onFill={(sample, index) => { setFormData(completeExample(fields, sample, index, title, formData)); aiRequest.setResult(null); aiRequest.setError(null); }} />
          {aiRequest.notice && <div className="sr-notice" role="status">{aiRequest.notice}</div>}

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
          {loading && <button type="button" className="btn btn-secondary" onClick={aiRequest.cancel}>Cancel</button>}
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

      <AIResultView result={response} loading={loading} error={error} title={title} />
    </div>
  );
}
