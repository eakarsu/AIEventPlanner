# Apply Pass 5 wave-1 — AIEventPlanner

- **Date:** 2026-05-08
- **Project:** AIEventPlanner
- **Stack:** Node.js + Express, PostgreSQL, React (CRA frontend).
- **Audit source:** `_AUDIT/reports/batch_03.md` § 20.

## Verified-present (from prior passes)

- `routes/aiNew.js`: seating-optimizer, budget-variance, post-event-summary, budget-planner, timeline-suggest, menu-recommend, vendor-recommend, guest-list-optimize — covers all six audit "missing AI counterparts".
- Inline `server.js`: AI event-suggestions, menu-generator, budget-optimizer, schedule-optimizer, vendor-matcher.
- `routes/integrations.js`: marketplace/vendors+reviews+bookings, streaming/sessions, day-of/checkin+announcement+incident.
- `routes/rsvp.js` + RSVP token flow.
- CRUD for events, venues, guests, catering, vendors, budgets, tasks, invitations, seating, entertainment.

## Implemented this pass (2 features, MECHANICAL)

| # | Item | File | Endpoint |
|---|------|------|----------|
| 1 | AI decor / mood-board concept | `backend/routes/aiNew.js` (appended) | `POST /api/ai/decor-suggest` |
| 2 | Post-event feedback summarizer (sentiment + themes + recs) | `backend/routes/aiNew.js` (appended) | `POST /api/ai/feedback-summarize` |

Both:
- Reuse `aiRateLimiter`, `pool`, `callOpenRouter` (via `setDeps`), `persistAnalysis` helpers.
- Return **HTTP 503** when `OPENROUTER_API_KEY` is missing (matches existing pattern).
- Persist into `ai_analyses` (auto-create-if-not-exists).
- `feedback-summarize` is tolerant: accepts an inline `feedback[]` body OR an `event_id` whose `event_feedback` table or `guests.notes` it reads. Pre-computes deterministic stats (count, avg, min, max).

**Frontend:**
- `pages/FormActionPage.js` — extended to support `type: 'json'` fields (parsed before send) and numeric coercion. Reused for both new endpoints.
- `App.js` — added two new routes (`/ai/decor-suggest`, `/ai/feedback-summarize`), two new `aiDecorSuggestFields` / `aiFeedbackSummarizeFields` arrays.

## Deferred backlog

| Item | Category | Reason |
|------|----------|--------|
| Vendor marketplace onboarding/payment | NEEDS-PRODUCT-DECISION | Provider + escrow flow undefined. |
| Hybrid streaming integration | NEEDS-CREDS | `STREAMING_PROVIDER_API_KEY` already gated in `routes/integrations.js`. |
| Day-of mobile UX | TOO-RISKY | Separate product surface. |
| Vendor reviews moderation | NEEDS-PRODUCT-DECISION | Moderation policy undefined. |

## Files changed

- `backend/routes/aiNew.js` (+~110 lines, two new endpoints appended before `module.exports`)
- `frontend/src/pages/FormActionPage.js` (+~18 lines, JSON + number-coerce helpers, json-textarea styling)
- `frontend/src/App.js` (+4 lines route + ~14 lines fields)

## Smoke test

- `node --check backend/server.js` -> OK.
- `node --check backend/routes/aiNew.js` -> OK.
- Brace/paren balance check passes for both modified FE files.
- 503-on-no-key contract matches existing endpoints.
