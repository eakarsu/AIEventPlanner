import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { section: 'Management', items: [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/events', icon: '🎉', label: 'Events' },
    { path: '/venues', icon: '🏛️', label: 'Venues' },
    { path: '/guests', icon: '👥', label: 'Guests' },
    { path: '/catering', icon: '🍽️', label: 'Catering' },
    { path: '/vendors', icon: '🤝', label: 'Vendors' },
    { path: '/budgets', icon: '💰', label: 'Budgets' },
    { path: '/tasks', icon: '✅', label: 'Tasks' },
    { path: '/invitations', icon: '💌', label: 'Invitations' },
    { path: '/seating', icon: '💺', label: 'Seating' },
    { path: '/entertainment', icon: '🎭', label: 'Entertainment' },
  ]},
  { section: 'AI Assistant', items: [
    { path: '/ai/event-suggestions', icon: '🤖', label: 'Event Suggestions' },
    { path: '/ai/menu-generator', icon: '🧑‍🍳', label: 'Menu Generator' },
    { path: '/ai/budget-optimizer', icon: '📈', label: 'Budget Optimizer' },
    { path: '/ai/schedule-optimizer', icon: '📅', label: 'Schedule Optimizer' },
    { path: '/ai/vendor-matcher', icon: '🔍', label: 'Vendor Matcher' },
    { path: '/ai/budget-planner', icon: '🧮', label: 'Budget Planner' },
    { path: '/ai/timeline-suggest', icon: '⏱️', label: 'Timeline Suggest' },
    { path: '/ai/seating-optimizer', icon: '💺', label: 'Seating Optimizer' },
    { path: '/ai/budget-variance', icon: '📊', label: 'Budget Variance' },
    { path: '/ai/post-event-summary', icon: '📝', label: 'Post-Event Summary' },
    { path: '/ai/menu-recommend', icon: '🍴', label: 'Menu Recommend' },
    { path: '/ai/vendor-recommend', icon: '🤖', label: 'Vendor Recommend' },
    { path: '/ai/guest-list-optimize', icon: '✉️', label: 'Guest List Optimize' },
  ]},
];

export default function Navbar({ user, onLogout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-header">
        <div className="navbar-brand">
          <div className="brand-icon">🎪</div>
          <div>
            <h2>AI Event Planner</h2>
            <span>Smart Event Management</span>
          </div>
        </div>
      </div>

      {navItems.map((section) => (
        <div className="nav-section" key={section.section}>
          <div className="nav-section-title">{section.section}</div>
          {section.items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div className="nav-user">
        <div className="nav-user-info">
          <div className="nav-user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="nav-user-name">{user?.name || 'User'}</div>
            <div className="nav-user-email">{user?.email || ''}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>Sign Out</button>
      </div>
    </nav>
  );
}
