import React from 'react';
import FormActionPage from './FormActionPage';
const fields = [
  { name: 'event_type', label: 'Event Type', type: 'text', required: true },
  { name: 'event_date', label: 'Event Date', type: 'date', required: true },
  { name: 'headcount', label: 'Headcount', type: 'number', min: 1 },
  { name: 'special_requirements', label: 'Special Requirements', type: 'textarea' },
];
const dates = [7, 14, 21].map(days => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); });
const samples = [
  { label: 'Wedding timeline draft', values: { event_type: 'Fictional wedding', event_date: dates[0], headcount: 100, special_requirements: 'Illustrative outdoor ceremony, accessible paths, and vegetarian menu; verify all details with the organizer.' } },
  { label: 'Conference timeline draft', values: { event_type: 'Fictional conference', event_date: dates[1], headcount: 150, special_requirements: 'Illustrative breakout rooms, presentation equipment, and captioning; confirm actual staffing and equipment.' } },
  { label: 'Community timeline draft', values: { event_type: 'Fictional community fundraiser', event_date: dates[2], headcount: 75, special_requirements: 'Illustrative volunteer shifts, food service, and accessible seating; confirm actual permissions and staffing.' } },
];
export default function TimelineSuggestPage({ token }) {
  return <FormActionPage token={token} endpoint="ai/timeline-suggest" title="AI Timeline Suggest" description="Draft a planning timeline with phases, tasks, and dependencies. These examples do not establish official deadlines or verified bookings." fields={fields} samples={samples} resultKey="timeline" />;
}
