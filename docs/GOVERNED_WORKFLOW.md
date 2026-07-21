# Governed event change control

`/api/governed-event-control` evaluates budgets in integer cents, capacity, schedule conflicts, and unresolved accessibility needs; records requirements and fallback plans; and gates approval/activation on role, contracts, readiness, and a fallback plan. Day-of changes are idempotent records with impact assessments rather than silent edits, and the history endpoint returns change and audit timelines.

Calendar, venue/maps, vendor/CRM, payments/accounting, ticketing, messaging, and weather connectors remain external adapters. Real credentials, webhook authentication, delivery receipts, refunds/reconciliation, consent policy, and venue/emergency validation are still required.

Use the separate bootstrap, migration, guarded demo seed, and non-mutating start scripts.
