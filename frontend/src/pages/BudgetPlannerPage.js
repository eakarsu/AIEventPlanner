import React from 'react';
import FormActionPage from './FormActionPage';
const fields = [
  { name: 'event_type', label: 'Event Type', type: 'text', required: true },
  { name: 'headcount', label: 'Headcount', type: 'number', min: 1, required: true },
  { name: 'total_budget', label: 'Total Budget', type: 'number', min: 1, required: true },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'currency', label: 'Currency', type: 'text', example: 'USD' },
];
const samples = [
  { label: 'Wedding planning draft', values: { event_type: 'Fictional wedding', headcount: 100, total_budget: 25000, location: 'Example garden venue', currency: 'USD' } },
  { label: 'Conference planning draft', values: { event_type: 'Fictional conference', headcount: 150, total_budget: 40000, location: 'Example convention space', currency: 'USD' } },
  { label: 'Community planning draft', values: { event_type: 'Fictional community fundraiser', headcount: 75, total_budget: 12000, location: 'Example community hall', currency: 'USD' } },
];
export default function BudgetPlannerPage({ token }) {
  return <FormActionPage token={token} endpoint="ai/budget-planner" title="AI Budget Planner" description="Prepare a draft budget breakdown, contingency, and savings review. Examples are fictional planning inputs; generating does not authorize spending or book a venue." fields={fields} samples={samples} resultKey="plan" />;
}
