import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppSidebar.css';

const LINKS = [
  { to: '/insights/timeline', label: 'Timeline View', group: 'Insights' },
  { to: '/codex/custom-viz', label: 'Custom Viz', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
  { to: '/batch03', label: 'Batch03 Features', group: 'Workspace' },
  { to: '/custom-views', label: 'Custom Views', group: 'Workspace' },
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/events', label: 'Events', group: 'Workspace' },
  { to: '/venues', label: 'Venues', group: 'Workspace' },
  { to: '/guests', label: 'Guests', group: 'Workspace' },
  { to: '/catering', label: 'Catering', group: 'Workspace' },
  { to: '/vendors', label: 'Vendors', group: 'Workspace' },
  { to: '/budgets', label: 'Budgets', group: 'Workspace' },
  { to: '/tasks', label: 'Tasks', group: 'Workspace' },
  { to: '/invitations', label: 'Invitations', group: 'Workspace' },
  { to: '/seating', label: 'Seating', group: 'Workspace' },
  { to: '/entertainment', label: 'Entertainment', group: 'Workspace' },
  { to: '/ai/event-suggestions', label: 'Event Suggestions', group: 'AI tools' },
  { to: '/ai/menu-generator', label: 'Menu Generator', group: 'AI tools' },
  { to: '/ai/budget-optimizer', label: 'Budget Optimizer', group: 'AI tools' },
  { to: '/ai/schedule-optimizer', label: 'Schedule Optimizer', group: 'AI tools' },
  { to: '/ai/vendor-matcher', label: 'Vendor Matcher', group: 'AI tools' },
  { to: '/ai/budget-planner', label: 'Budget Planner', group: 'AI tools' },
  { to: '/ai/timeline-suggest', label: 'Timeline Suggest', group: 'AI tools' },
  { to: '/ai/seating-optimizer', label: 'Seating Optimizer', group: 'AI tools' },
  { to: '/ai/budget-variance', label: 'Budget Variance', group: 'AI tools' },
  { to: '/ai/post-event-summary', label: 'Post Event Summary', group: 'AI tools' },
  { to: '/ai/menu-recommend', label: 'Menu Recommend', group: 'AI tools' },
  { to: '/ai/vendor-recommend', label: 'Vendor Recommend', group: 'AI tools' },
  { to: '/ai/guest-list-optimize', label: 'Guest List Optimize', group: 'AI tools' },
  { to: '/ai/decor-suggest', label: 'Decor Suggest', group: 'AI tools' },
  { to: '/ai/agentic-coordinator', label: 'Event Coordinator', group: 'AI tools' },
  { to: '/ai/decor-moodboard', label: 'Decor Moodboard', group: 'AI tools' },
  { to: '/ai/feedback-summarize', label: 'Feedback Summarize', group: 'AI tools' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AIEvent Planner</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
