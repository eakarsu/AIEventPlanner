import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function getStatusClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (['confirmed', 'completed', 'paid', 'accepted', 'available'].includes(s)) return 'green';
  if (['planning', 'pending', 'in progress', 'deposit paid', 'maybe'].includes(s)) return 'yellow';
  if (['cancelled', 'declined', 'overdue', 'unavailable'].includes(s)) return 'red';
  if (['draft', 'booked'].includes(s)) return 'blue';
  return 'purple';
}

export default function CrudPage({ token, endpoint, title, fields }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API}/api/${endpoint}`, { headers });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [endpoint]);

  const openNew = () => {
    setEditItem(null);
    setFormData({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const data = {};
    fields.forEach(f => {
      let val = item[f.name];
      if (f.type === 'date' && val) val = val.split('T')[0];
      data[f.name] = val || '';
    });
    setFormData(data);
    setShowDetail(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const url = editItem ? `${API}/api/${endpoint}/${editItem.id}` : `${API}/api/${endpoint}`;
      const method = editItem ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(formData) });
      setShowForm(false);
      fetchItems();
    } catch (err) {
      alert('Error saving: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`${API}/api/${endpoint}/${id}`, { method: 'DELETE', headers });
      setShowDetail(null);
      fetchItems();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const displayFields = fields.slice(0, 5);

  const filtered = items.filter(item =>
    Object.values(item).some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const formatValue = (val, field) => {
    if (val === null || val === undefined) return '-';
    if (field?.type === 'date' && val) return new Date(val).toLocaleDateString();
    if (field?.type === 'number' && field.label?.includes('$')) return `$${Number(val).toLocaleString()}`;
    if (field?.type === 'number' && field.label?.includes('Rate')) return `$${Number(val).toLocaleString()}/hr`;
    return String(val);
  };

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>Manage your {title.toLowerCase()} - {items.length} total items</p>
      </div>

      <div className="crud-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="add-btn" onClick={openNew}>+ New {title.replace(/s$/, '')}</button>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <div className="loading-text">Loading {title.toLowerCase()}...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No {title.toLowerCase()} found</h3>
          <p>Create your first item to get started</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                {displayFields.map(f => <th key={f.name}>{f.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} onClick={() => setShowDetail(item)}>
                  <td>{item.id}</td>
                  {displayFields.map(f => (
                    <td key={f.name}>
                      {['status', 'rsvp_status', 'priority', 'availability'].includes(f.name) ? (
                        <span className={`status-badge ${getStatusClass(item[f.name])}`}>
                          {item[f.name] || '-'}
                        </span>
                      ) : (
                        formatValue(item[f.name], f)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showDetail[fields[0]?.name] || `${title} #${showDetail.id}`}</h2>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {fields.map(f => (
                  <div className="detail-field" key={f.name}>
                    <div className="label">{f.label}</div>
                    <div className="value">
                      {['status', 'rsvp_status', 'priority', 'availability'].includes(f.name) ? (
                        <span className={`status-badge ${getStatusClass(showDetail[f.name])}`}>
                          {showDetail[f.name] || '-'}
                        </span>
                      ) : (
                        formatValue(showDetail[f.name], f)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={() => handleDelete(showDetail.id)}>Delete</button>
              <button className="btn-primary" onClick={() => openEdit(showDetail)}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit' : 'New'} {title.replace(/s$/, '')}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {fields.map(f => (
                <div className="form-field" key={f.name}>
                  <label>{f.label} {f.required && '*'}</label>
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
                      required={f.required}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
