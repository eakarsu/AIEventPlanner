import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const features = [
  { path: '/events', icon: '🎉', title: 'Events', desc: 'Create and manage all your events with detailed planning tools', color: '#6366f1', countKey: 'totalEvents' },
  { path: '/venues', icon: '🏛️', title: 'Venues', desc: 'Browse and manage venue listings with capacity and amenity details', color: '#8b5cf6', countKey: 'totalVenues' },
  { path: '/guests', icon: '👥', title: 'Guest Lists', desc: 'Track RSVPs, dietary needs, seating, and guest communications', color: '#a855f7', countKey: 'totalGuests' },
  { path: '/catering', icon: '🍽️', title: 'Catering Menus', desc: 'Explore cuisine options with pricing, dietary accommodations', color: '#d946ef' },
  { path: '/vendors', icon: '🤝', title: 'Vendors', desc: 'Manage vendor relationships, rates, and availability', color: '#ec4899', countKey: 'totalVendors' },
  { path: '/budgets', icon: '💰', title: 'Budget Tracking', desc: 'Monitor estimated vs actual costs across all categories', color: '#f43f5e' },
  { path: '/tasks', icon: '✅', title: 'Task Management', desc: 'Assign, track, and prioritize event planning tasks', color: '#ef4444', countKey: 'totalTasks' },
  { path: '/invitations', icon: '💌', title: 'Invitations', desc: 'Send and track invitations with RSVP status monitoring', color: '#f97316' },
  { path: '/seating', icon: '💺', title: 'Seating Plans', desc: 'Design table arrangements and assign guests to seats', color: '#eab308' },
  { path: '/entertainment', icon: '🎭', title: 'Entertainment', desc: 'Book performers, DJs, and activities for your events', color: '#22c55e' },
  { path: '/ai/event-suggestions', icon: '🤖', title: 'AI Event Suggestions', desc: 'Get creative AI-powered event ideas tailored to your needs', color: '#06b6d4', ai: true },
  { path: '/ai/menu-generator', icon: '🧑‍🍳', title: 'AI Menu Generator', desc: 'Generate custom menus with pairings and dietary options', color: '#0ea5e9', ai: true },
  { path: '/ai/budget-optimizer', icon: '📈', title: 'AI Budget Optimizer', desc: 'Optimize your budget allocation with AI recommendations', color: '#3b82f6', ai: true },
  { path: '/ai/schedule-optimizer', icon: '📅', title: 'AI Schedule Optimizer', desc: 'Create optimal event timelines and schedules with AI', color: '#6366f1', ai: true },
  { path: '/ai/vendor-matcher', icon: '🔍', title: 'AI Vendor Matcher', desc: 'Find ideal vendors with AI-powered matching and advice', color: '#8b5cf6', ai: true },
];

export default function Dashboard({ token }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch(`${API}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [token]);

  const statCards = [
    { icon: '🎉', label: 'Events', value: stats.totalEvents || 0, bg: 'rgba(99, 102, 241, 0.15)' },
    { icon: '🏛️', label: 'Venues', value: stats.totalVenues || 0, bg: 'rgba(139, 92, 246, 0.15)' },
    { icon: '👥', label: 'Guests', value: stats.totalGuests || 0, bg: 'rgba(168, 85, 247, 0.15)' },
    { icon: '🤝', label: 'Vendors', value: stats.totalVendors || 0, bg: 'rgba(236, 72, 153, 0.15)' },
    { icon: '✅', label: 'Tasks', value: stats.totalTasks || 0, bg: 'rgba(239, 68, 68, 0.15)' },
    { icon: '💰', label: 'Total Budget', value: `$${(stats.totalBudget || 0).toLocaleString()}`, bg: 'rgba(34, 197, 94, 0.15)' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your event planning overview.</p>
      </div>

      <div className="stats-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="page-header" style={{ marginTop: 16 }}>
        <h1>Features</h1>
        <p>Click any card to manage that area of your event planning.</p>
      </div>

      <div className="cards-grid">
        {features.map((f) => (
          <div
            key={f.path}
            className="feature-card"
            style={{ '--card-color': f.color }}
            onClick={() => navigate(f.path)}
          >
            <div className="card-icon" style={{ background: `${f.color}20` }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            {f.ai && <div className="card-count">AI Powered</div>}
            {f.countKey && stats[f.countKey] !== undefined && (
              <div className="card-count">{stats[f.countKey]} items</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
