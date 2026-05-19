import React from 'react';
import EventTimelineGantt from '../components/EventTimelineGantt';
import VendorUtilizationHeatmap from '../components/VendorUtilizationHeatmap';
import EventBriefPdf from '../components/EventBriefPdf';
import ContractRulesEditor from '../components/ContractRulesEditor';

export default function CustomViewsPage({ token }) {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }} data-testid="custom-views-page">
      <h1 style={{ marginTop: 0 }}>Event Views</h1>
      <p style={{ color: '#666', marginBottom: 18 }}>
        Custom event-planning views: Gantt timeline, vendor utilization heatmap,
        run-of-show PDF export, and contract-rules CRUD.
      </p>
      <EventTimelineGantt token={token} />
      <VendorUtilizationHeatmap token={token} />
      <EventBriefPdf token={token} />
      <ContractRulesEditor token={token} />
    </div>
  );
}
