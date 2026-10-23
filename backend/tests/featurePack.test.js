'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterEvents, toCsv } = require('../domain/featurePack');

test('filterEvents searches and filters the main record list', () => {
  const rows = [
    { name: 'Gala Night', event_type: 'gala', status: 'planned', budget: 0 },
    { name: 'Team Offsite', event_type: 'corporate', status: 'done', budget: 500 },
  ];
  assert.equal(filterEvents(rows, { search: 'gala' }).length, 1);
  assert.equal(filterEvents(rows, { status: 'done' })[0].name, 'Team Offsite');
  assert.equal(filterEvents(rows, { event_type: 'corporate' }).length, 1);
  assert.equal(filterEvents(rows, {}).length, 2);
});

test('CSV export preserves 0 budget and escapes commas', () => {
  assert.match(toCsv([{ id: 1, name: 'Gala, Night', event_type: 'gala', status: 'planned', budget: 0 }]), /"Gala, Night",gala,planned,,0/);
});
