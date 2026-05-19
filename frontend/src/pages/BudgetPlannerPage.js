import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function BudgetPlannerPage({ token }) {
  const [formData, setFormData] = useState({
    event_type: '',
    headcount: '',
    total_budget: '',
    location: '',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const fields = [
    { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Wedding, Conference', required: true },
    { name: 'headcount', label: 'Headcount', type: 'number', placeholder: '100', required: true },
    { name: 'total_budget', label: 'Total Budget', type: 'number', placeholder: '25000', required: true },
    { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., San Francisco' },
    { name: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
  ];

  const handleSubmit = async () => {
    setError('');
    setResponse(null);

    if (!formData.event_type || !formData.headcount || !formData.total_budget) {
      setError('Event type, headcount, and total budget are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/budget-planner`, {
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

  const plan = response?.plan;

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>AI Budget Planner</h1>
        <p>Get a structured budget breakdown with line items, contingency, and savings opportunities.</p>
      </div>

      <div className="ai-form-card">
        <div className="ai-form-grid">
          {fields.map(f => (
            <div className="form-field" key={f.name}>
              <label>{f.label}{f.required ? ' *' : ''}</label>
              <input
                type={f.type}
                value={formData[f.name] || ''}
                onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                placeholder={f.placeholder || ''}
              />
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
            <>🤖 Generate Budget Plan</>
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
            <div className="loading-text">AI is building your budget plan...</div>
          </div>
        </div>
      )}

      {response && !loading && plan && (
        <div className="ai-response-card">
          <div className="ai-response-header">
            <h3><span>✨</span> Budget Plan</h3>
            <span className="ai-model-badge">{response.model || 'AI Model'}</span>
          </div>
          <div className="ai-response-body">
            {plan.summary && <p><strong>Summary:</strong> {plan.summary}</p>}
            <p>
              <strong>Total:</strong> {plan.total_budget} {plan.currency || 'USD'} for {plan.headcount} guests
            </p>

            {Array.isArray(plan.line_items) && plan.line_items.length > 0 && (
              <>
                <h4>Line Items</h4>
                <ul>
                  {plan.line_items.map((item, i) => (
                    <li key={i}>
                      <strong>{item.category}</strong>
                      {item.subcategory ? ` — ${item.subcategory}` : ''}: {item.estimated_cost}
                      {item.percentage_of_total ? ` (${item.percentage_of_total}%)` : ''}
                      {item.notes ? <div><em>{item.notes}</em></div> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {plan.contingency && (
              <p>
                <strong>Contingency:</strong> {plan.contingency.amount}
                {plan.contingency.percentage ? ` (${plan.contingency.percentage}%)` : ''}
              </p>
            )}

            {Array.isArray(plan.savings_opportunities) && plan.savings_opportunities.length > 0 && (
              <>
                <h4>Savings Opportunities</h4>
                <ul>{plan.savings_opportunities.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </>
            )}

            {Array.isArray(plan.risks_and_overages) && plan.risks_and_overages.length > 0 && (
              <>
                <h4>Risks & Overages</h4>
                <ul>{plan.risks_and_overages.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </>
            )}

            {plan.raw && <pre style={{ whiteSpace: 'pre-wrap' }}>{plan.raw}</pre>}
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
