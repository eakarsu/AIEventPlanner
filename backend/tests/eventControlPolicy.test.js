'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const { assessPlan, assertTransition } = require('../domain/eventControlPolicy');
test('readiness accounts for budget capacity conflicts and accessibility', () => assert.deepEqual(assessPlan({ budgetCents: 10000, committedCents: 7000, capacity: 100, expectedAttendance: 80, conflicts: [], accessibilityNeeds: [{ resolution: 'ramp booked' }] }), { ready: true, budgetRemainingCents: 3000, capacityRemaining: 20, conflictCount: 0, accessibilityOpen: 0 }));
test('unresolved accessibility blocks readiness', () => assert.equal(assessPlan({ budgetCents: 1, committedCents: 1, capacity: 1, expectedAttendance: 1, accessibilityNeeds: [{}] }).ready, false));
test('activation requires operational fallback', () => assert.throws(() => assertTransition('approved', 'active', { contractsApproved: true }), /fallback/));
