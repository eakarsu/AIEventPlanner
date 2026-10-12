import React from 'react';
import FormActionPage from './FormActionPage';
const fields = [{ name: 'event_id', label: 'Saved Event', type: 'select', required: true, requiresExistingRecord: true, options: [] }];
export default function EventActionPage({ token, endpoint, title, description }) {
  return <FormActionPage token={token} endpoint={endpoint} title={title} description={description} fields={fields} />;
}
