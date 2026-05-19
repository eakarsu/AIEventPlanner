# Audit Notes — AIEventPlanner

Audit source: `_AUDIT/reports/batch_03.md` § 20 (skeleton, audit reported 0 AI endpoints).

## Original audit recommendations

### Missing AI counterparts
- `/seating-optimizer`, `/budget-planner`, `/vendor-recommend`,
  `/guest-list-optimize`, `/timeline-suggest`, `/menu-recommend`.

### Missing non-AI features
- Event CRUD.
- Vendor management.
- Budget tracking.
- Guest list.
- Task list.
- Timeline.
- Document templates (invitations, contracts).

### Custom feature suggestions
- Agentic event coordinator.
- AI décor / mood-board generation.
- Real-time guest management.
- Vendor marketplace.
- Day-of mobile coordination.
- Post-event analytics.
- Hybrid (in-person + streaming) support.

## Current state observed

`routes/aiNew.js` already had `/seating-optimizer`, `/budget-variance`, and
`/post-event-summary`. Two of six missing AI counterparts (`seating-optimizer`,
post-event analytics) were already covered.

## Implementations applied this pass

1. **`POST /api/ai/budget-planner`** — generates a structured budget
   allocation (line items + contingency + savings) given event type,
   headcount, and total budget.
2. **`POST /api/ai/timeline-suggest`** — generates a backwards-planning
   timeline (phases, tasks, critical path) given event type and date.

Both reuse the existing `callOpenRouter` + `persistAnalysis` helpers and pass
`node --check`.

## Prioritized backlog

1. **MECHANICAL** — Add `/api/ai/menu-recommend` taking dietary restrictions
   and budget; returns menu options and per-guest cost.
2. **MECHANICAL** — Add `/api/ai/vendor-recommend` taking event criteria
   and returning vendor archetypes + interview questions.
3. **MECHANICAL** — Add `/api/ai/guest-list-optimize` taking event goals
   and returning guest-list rationale.
4. **NEEDS-PRODUCT-DECISION** — Vendor marketplace requires onboarding,
   reviews, payment.
5. **NEEDS-CREDS** — Hybrid streaming integration needs a streaming
   provider account.
6. **TOO-RISKY** — Day-of mobile UX is a separate product surface; out of
   mechanical-route scope.

## Apply pass 3 (frontend)

- **Action:** UPDATED-FE
- **Files modified:**
  - `frontend/src/pages/EventActionPage.js` (new) — generic `event_id`-only AI action page reused for three endpoints
  - `frontend/src/App.js` — imported `EventActionPage`, added three new routes: `/ai/seating-optimizer`, `/ai/budget-variance`, `/ai/post-event-summary`
  - `frontend/src/components/Navbar.js` — added five AI Assistant nav items (the two pass-2 dedicated pages were not previously linked, plus the three new generic-page entries)
- **Why:** Pass 2 added five `/api/ai/*` endpoints in `routes/aiNew.js`, but only `BudgetPlannerPage` and `TimelineSuggestPage` had FE pages, and even those weren't reachable from the Navbar. The other three (`seating-optimizer`, `budget-variance`, `post-event-summary`) all take a single `{ event_id }`, so a single generic `EventActionPage` covers them.
- **Patterns followed:** JWT via `localStorage.getItem('token')` Bearer header; explicit 503 messaging when `OPENROUTER_API_KEY` is missing server-side; reuses the project's existing `.ai-page` / `.ai-form-card` / `.ai-response-card` / `.spinner` Tailwind-style classes; no new dependencies, no `npm install`.
- **Syntax check:** Bracket-balance PASS for all three modified files; `node --check` does not parse JSX so was skipped per protocol.

## Apply pass 4 (mechanical backlog)

- **Action:** UPDATED-BE-AND-FE
- **Mechanical items implemented (3 of 3 from backlog):**

| # | Item | File | Endpoint |
|---|------|------|----------|
| 1 | AI Menu Recommend | `backend/routes/aiNew.js` | `POST /api/ai/menu-recommend` |
| 2 | AI Vendor Recommend | `backend/routes/aiNew.js` | `POST /api/ai/vendor-recommend` |
| 3 | AI Guest-List Optimize | `backend/routes/aiNew.js` | `POST /api/ai/guest-list-optimize` |

- **Pattern:** All three reuse the existing `callOpenRouter` + `persistAnalysis` helpers, return JSON-shape responses, and explicitly `return res.status(503)` when `OPENROUTER_API_KEY` is missing.
- **FE:** New generic `frontend/src/pages/FormActionPage.js` (form-driven, JWT bearer, 503 messaging, project styles). `App.js` adds 3 routes + 3 field arrays (`aiMenuRecommendFields`, `aiVendorRecommendFields`, `aiGuestListOptimizeFields`). `components/Navbar.js` adds 3 entries under "AI Assistant".
- **Smoke test (port 49301):** register -> 200; `POST /api/ai/menu-recommend {event_type:"Wedding"}` -> 400 `headcount is required`; `POST /api/ai/guest-list-optimize {event_type:"Gala"}` -> 400 `event_goals is required`; `POST /api/ai/vendor-recommend` full body -> 500 (LLM model 404 from OpenRouter — route + helper reached). Cleanup OK.
- **Syntax:** `node --check` PASS for `aiNew.js`. Bracket balance PASS for the three modified JSX files.

## Backlog remaining after pass 4

| Item | Tag |
|---|---|
| Vendor marketplace (onboarding/payment) | NEEDS-PRODUCT-DECISION |
| Hybrid streaming integration | NEEDS-CREDS |
| Day-of mobile coordination UX | TOO-RISKY |
