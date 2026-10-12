import AIFieldPresets, { completeExample } from './AIFieldPresets';
import AIResultView from './AIResultView';
import useCancelableAI from './useCancelableAI';
import React, { useEffect, useState } from 'react';

const API = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '');

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
export default function FormActionPage({ token, endpoint, title, description, fields, resultKey, samples = [] }) {
  const [formData, setFormData] = useState({});
  const [sourceRows, setSourceRows] = useState([]);
  const [sourceError, setSourceError] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceReload, setSourceReload] = useState(0);
  const needsEvents = (fields || []).some(field => field.name === 'event_id');
  useEffect(() => {
    if (!needsEvents) return undefined;
    const controller = new AbortController(); setSourceLoading(true); setSourceError('');
    fetch(API + '/api/events', { signal: controller.signal, headers: { Authorization: 'Bearer ' + (token || localStorage.getItem('token')) } }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not load saved events.'); const rows = Array.isArray(body) ? body : body.data; if (!Array.isArray(rows)) throw new Error('The saved event response could not be read.'); if (!controller.signal.aborted) setSourceRows(rows); }).catch(error => { if (!controller.signal.aborted) setSourceError(error.message || 'Could not load saved events.'); }).finally(() => { if (!controller.signal.aborted) setSourceLoading(false); });
    return () => controller.abort();
  }, [needsEvents, token, sourceReload]);
  const sourceOptions = sourceRows.map(row => ({ value: String(row.id), label: row.title || row.name || ('Saved event #' + row.id) }));
  const currentFields = (fields || []).map(field => field.name === 'event_id' ? { ...field, type: 'select', requiresExistingRecord: true, options: sourceOptions } : field);
  const aiRequest = useCancelableAI();
  const { loading, error, setError, result: response, setResult: setResponse } = aiRequest;



  const handleSubmit = async () => aiRequest.run(async (options) => { const missing = (fields || []).filter((field) => field.required && (formData[field.name] === undefined || formData[field.name] === '')); if (missing.length) throw new Error('Required: ' + missing.map((field) => field.label).join(', ')); const payload = { ...formData }; for (const field of fields || []) { if (field.type === 'json' && payload[field.name]) { try { payload[field.name] = JSON.parse(payload[field.name]); } catch (_) { throw new Error(field.label + ': enter valid structured data.'); } } if ((field.type === 'number' || field.name === 'event_id') && payload[field.name] !== '' && payload[field.name] !== undefined) payload[field.name] = Number(payload[field.name]); } const tokenVal = token || localStorage.getItem('token'); const res = await fetch(`${API}/api/${endpoint}`, { ...options, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVal}` }, body: JSON.stringify(payload) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'AI request failed'); return data; });

  const result = resultKey && response ? response[resultKey] : null;

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {sourceLoading && <p role="status">Loading saved events…</p>}{sourceError && <div className="login-error" role="alert">{sourceError} <button type="button" onClick={() => setSourceReload(value => value + 1)}>Retry saved events</button></div>}
      {needsEvents && !sourceLoading && !sourceError && !sourceOptions.length && <p role="status">No saved event is available. {fields.some(field => field.name === 'event_id' && field.required) ? 'Save or select an actual event before generating this report.' : 'You can supply draft feedback instead; examples never invent event IDs.'}</p>}
      <div className="ai-form-card">
        <AIFieldPresets fields={currentFields} samples={samples} context={title} disabled={loading} onFill={(sample, index) => { setFormData(completeExample(currentFields, sample, index, title, formData)); aiRequest.setResult(null); }} />

        <div className="ai-form-grid">
          {currentFields.map(f => (
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
                  {f.options.map(opt => <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  min={f.min} max={f.max} step={f.step}
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                />
              )}
            </div>
          ))}
        </div>

        <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading || currentFields.some(field => field.required && field.requiresExistingRecord && !formData[field.name])}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
              Generating with AI...
            </>
          ) : (
            <>Generate with OpenRouter</>
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
            <div className="loading-text">AI is thinking...</div>
          </div>
        </div>
      )}

      <AIResultView result={result || response} loading={loading} error={error} title={title} model={response?.model} tokens={response?.usage} />
    </div>
  );
}
