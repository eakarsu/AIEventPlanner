import React, { useEffect, useState } from 'react';

const card = { background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 18 };
const inp = { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, flex: 1 };

const empty = { rule_name: '', rule_type: 'cancellation', condition: '', action: '', priority: 1, enabled: true, vendor_id: '', notes: '' };

export default function ContractRulesEditor({ token }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    fetch('/api/custom-views/contract-rules', { headers: auth })
      .then(r => r.json()).then(d => setRules(d.rules || []))
      .catch(e => setMsg(`Load error: ${e.message}`));
  };
  useEffect(load, [token]);

  const save = async () => {
    setMsg('Saving…');
    const url = editingId
      ? `/api/custom-views/contract-rules/${editingId}`
      : '/api/custom-views/contract-rules';
    const method = editingId ? 'PUT' : 'POST';
    const body = JSON.stringify({ ...form, vendor_id: form.vendor_id || null, priority: Number(form.priority) || 1 });
    const r = await fetch(url, { method, headers: auth, body });
    if (r.ok) {
      setMsg(editingId ? 'Updated' : 'Created');
      setForm(empty);
      setEditingId(null);
      load();
    } else {
      const t = await r.text();
      setMsg(`Error: ${t.slice(0, 200)}`);
    }
  };

  const edit = (rule) => {
    setEditingId(rule.id);
    setForm({
      rule_name: rule.rule_name || '',
      rule_type: rule.rule_type || 'general',
      condition: rule.condition || '',
      action: rule.action || '',
      priority: rule.priority || 1,
      enabled: rule.enabled !== false,
      vendor_id: rule.vendor_id || '',
      notes: rule.notes || '',
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    const r = await fetch(`/api/custom-views/contract-rules/${id}`, { method: 'DELETE', headers: auth });
    if (r.ok) { setMsg('Deleted'); load(); }
    else setMsg('Delete failed');
  };

  return (
    <div style={card} data-testid="contract-rules-editor">
      <h3 style={{ marginTop: 0 }}>Vendor / Contract Rules Editor</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input style={inp} placeholder="Rule name *" value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} />
        <select style={inp} value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}>
          <option value="cancellation">cancellation</option>
          <option value="payment">payment</option>
          <option value="overage">overage</option>
          <option value="exclusivity">exclusivity</option>
          <option value="general">general</option>
        </select>
        <input style={inp} placeholder="Condition (e.g., guest_count > 200)" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} />
        <input style={inp} placeholder="Action (e.g., apply 10% surcharge)" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} />
        <input style={inp} placeholder="Priority" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} />
        <input style={inp} placeholder="Vendor ID (optional)" value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} />
        <input style={{ ...inp, gridColumn: '1 / span 2' }} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Enabled
        </label>
        <button onClick={save} style={{ padding: '8px 16px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {editingId ? 'Update Rule' : 'Add Rule'}
        </button>
        {editingId && (
          <button onClick={() => { setEditingId(null); setForm(empty); }} style={{ padding: '8px 12px', background: '#999', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        )}
        {msg && <span style={{ fontSize: 12, color: '#666' }}>{msg}</span>}
      </div>
      <div style={{ marginTop: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Name</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Type</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Condition</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Action</th>
              <th style={{ padding: 6 }}>Pri</th>
              <th style={{ padding: 6 }}>On</th>
              <th style={{ padding: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 6 }}>{r.id}</td>
                <td style={{ padding: 6 }}>{r.rule_name}</td>
                <td style={{ padding: 6 }}>{r.rule_type}</td>
                <td style={{ padding: 6, color: '#555' }}>{r.condition}</td>
                <td style={{ padding: 6, color: '#555' }}>{r.action}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{r.priority}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{r.enabled ? '✓' : '—'}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>
                  <button onClick={() => edit(r)} style={{ marginRight: 4, padding: '4px 8px', fontSize: 12 }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ padding: '4px 8px', fontSize: 12, color: '#c62828' }}>Delete</button>
                </td>
              </tr>
            ))}
            {!rules.length && (
              <tr><td colSpan={8} style={{ padding: 12, color: '#888', textAlign: 'center' }}>No rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
