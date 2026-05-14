const express = require('express');
const router = express.Router();
const { aiRateLimiter } = require('../middleware/rateLimiter');

let pool;
let callOpenRouter;
const setDeps = (p, fn) => { pool = p; callOpenRouter = fn; };

async function persistAnalysis(pool, userId, analysisType, eventId, content, model) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      analysis_type VARCHAR(100),
      event_id INTEGER,
      content TEXT,
      model VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  const result = await pool.query(
    `INSERT INTO ai_analyses (user_id, analysis_type, event_id, content, model)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, analysisType, eventId, content, model]
  );
  return result.rows[0].id;
}

// POST /api/ai/seating-optimizer
router.post('/seating-optimizer', aiRateLimiter, async (req, res) => {
  try {
    const { event_id } = req.body;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const guestsResult = await pool.query(
      'SELECT name, dietary_restrictions, plus_ones, table_number FROM guests WHERE event_id = $1',
      [event_id]
    );

    const guests = guestsResult.rows;
    if (guests.length === 0) {
      return res.status(404).json({ error: 'No guests found for this event' });
    }

    const guestSummary = guests.map(g =>
      `- ${g.name} (dietary: ${g.dietary_restrictions || 'none'}, plus-ones: ${g.plus_ones || 0}, current table: ${g.table_number || 'unassigned'})`
    ).join('\n');

    const prompt = `You are an expert event seating coordinator. Create an optimal table assignment plan for the following guests:

${guestSummary}

Provide:
1. Optimal Table Assignments (group guests logically, considering dietary needs and plus-ones)
2. Table Layout Recommendations (number of tables, table sizes)
3. Special Considerations (dietary restrictions, VIP seating)
4. Seating Flow Strategy
5. Any conflicts or considerations to be aware of

Format with clear headers and numbered table assignments.`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No seating plan generated';

    const analysisId = await persistAnalysis(pool, req.user?.id, 'seating-optimizer', event_id, content, response.model);

    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/budget-variance
router.post('/budget-variance', aiRateLimiter, async (req, res) => {
  try {
    const { event_id } = req.body;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const budgetResult = await pool.query(
      'SELECT category, estimated_cost, actual_cost, vendor_name, status FROM budgets WHERE event_id = $1',
      [event_id]
    );

    const eventResult = await pool.query('SELECT name, budget FROM events WHERE id = $1', [event_id]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'No budget items found for this event' });
    }

    const event = eventResult.rows[0];
    const budgetLines = budgetResult.rows.map(b =>
      `- ${b.category} (vendor: ${b.vendor_name || 'TBD'}): estimated $${b.estimated_cost}, actual $${b.actual_cost || 0}, status: ${b.status}`
    ).join('\n');

    const totalEstimated = budgetResult.rows.reduce((sum, b) => sum + parseFloat(b.estimated_cost || 0), 0);
    const totalActual = budgetResult.rows.reduce((sum, b) => sum + parseFloat(b.actual_cost || 0), 0);

    const prompt = `You are a financial analyst specializing in event budgets. Analyze the following budget data for event "${event?.name || 'Event'}":

Total Event Budget: $${event?.budget || 'Not set'}
Total Estimated: $${totalEstimated.toFixed(2)}
Total Actual Spend: $${totalActual.toFixed(2)}

Budget Line Items:
${budgetLines}

Provide:
1. Budget Variance Analysis (estimated vs actual for each category)
2. Spend Forecast (projected final spend)
3. Over-Budget Areas and Causes
4. Under-Budget Opportunities
5. Risk Assessment for remaining unspent categories
6. Recommendations to stay within budget
7. Summary Dashboard (total variance, % over/under)`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No analysis generated';

    const analysisId = await persistAnalysis(pool, req.user?.id, 'budget-variance', event_id, content, response.model);

    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/post-event-summary
router.post('/post-event-summary', aiRateLimiter, async (req, res) => {
  try {
    const { event_id } = req.body;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const [eventResult, guestsResult, vendorsResult, tasksResult] = await Promise.all([
      pool.query('SELECT * FROM events WHERE id = $1', [event_id]),
      pool.query('SELECT rsvp_status, COUNT(*) as count FROM guests WHERE event_id = $1 GROUP BY rsvp_status', [event_id]),
      pool.query(
        `SELECT v.name, v.service_type, v.rating FROM vendors v
         JOIN budgets b ON b.vendor_name = v.name WHERE b.event_id = $1`,
        [event_id]
      ),
      pool.query(
        'SELECT status, COUNT(*) as count FROM tasks WHERE event_id = $1 GROUP BY status',
        [event_id]
      ),
    ]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    const rsvpStats = guestsResult.rows.map(r => `${r.rsvp_status}: ${r.count}`).join(', ');
    const vendorList = vendorsResult.rows.map(v => `${v.name} (${v.service_type}, rating: ${v.rating || 'N/A'})`).join(', ');
    const taskStats = tasksResult.rows.map(t => `${t.status}: ${t.count}`).join(', ');

    const prompt = `You are an expert event consultant. Generate a comprehensive post-event lessons-learned summary for:

Event: ${event.name}
Type: ${event.event_type}
Date: ${event.date}
Location: ${event.location || 'Not specified'}
Budget: $${event.budget || 'Not set'}
Status: ${event.status}

RSVP Statistics: ${rsvpStats || 'No data'}
Vendors Used: ${vendorList || 'No vendor data'}
Task Completion: ${taskStats || 'No task data'}

Generate a post-event summary including:
1. Executive Summary
2. What Went Well
3. Areas for Improvement
4. Guest Attendance Analysis
5. Vendor Performance Review
6. Budget Performance (if applicable)
7. Task Management Effectiveness
8. Key Lessons Learned
9. Recommendations for Future Events
10. Overall Event Score and Rationale`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No summary generated';

    const analysisId = await persistAnalysis(pool, req.user?.id, 'post-event-summary', event_id, content, response.model);

    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/budget-planner
// Accepts { event_type, headcount, total_budget, location?, currency? }
// Returns AI-suggested budget allocation across line items
router.post('/budget-planner', aiRateLimiter, async (req, res) => {
  try {
    const { event_type, headcount, total_budget, location, currency } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type is required' });
    if (!headcount) return res.status(400).json({ error: 'headcount is required' });
    if (!total_budget) return res.status(400).json({ error: 'total_budget is required' });

    const prompt = `You are an experienced event-budget planner. Build a realistic budget breakdown.

Event type: ${event_type}
Headcount: ${headcount}
Total budget: ${total_budget} ${currency || 'USD'}
Location: ${location || 'not specified'}

Return JSON only with this shape:
{
  "currency": "${currency || 'USD'}",
  "total_budget": ${total_budget},
  "headcount": ${headcount},
  "line_items": [{"category": "...", "subcategory": "...", "estimated_cost": <number>, "percentage_of_total": <number>, "notes": "..."}],
  "contingency": {"amount": <number>, "percentage": <number>},
  "savings_opportunities": ["..."],
  "risks_and_overages": ["..."],
  "summary": "<short narrative>"
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No plan generated';

    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }

    const analysisId = await persistAnalysis(pool, req.user?.id, 'budget-planner', null, content, response.model);
    res.json({ plan: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/timeline-suggest
// Accepts { event_type, event_date, headcount?, special_requirements? }
// Returns AI-suggested planning timeline with task / vendor deadlines
router.post('/timeline-suggest', aiRateLimiter, async (req, res) => {
  try {
    const { event_type, event_date, headcount, special_requirements } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type is required' });
    if (!event_date) return res.status(400).json({ error: 'event_date is required' });

    const prompt = `You are an expert event coordinator. Build a backwards-planning timeline from the event date to today.

Event type: ${event_type}
Event date: ${event_date}
Headcount: ${headcount || 'not specified'}
Special requirements: ${special_requirements || 'none'}

Return JSON only with this shape:
{
  "event_date": "${event_date}",
  "phases": [
    {
      "name": "<e.g. 6 months out|3 months out|1 month out|week of|day of>",
      "weeks_from_event": <integer>,
      "tasks": [{"task": "...", "owner": "...", "vendor_dependency": "...", "estimated_hours": <number>, "deadline_date": "<YYYY-MM-DD>"}]
    }
  ],
  "critical_path": ["..."],
  "risks": ["..."],
  "summary": "<short narrative>"
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No timeline generated';

    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }

    const analysisId = await persistAnalysis(pool, req.user?.id, 'timeline-suggest', null, content, response.model);
    res.json({ timeline: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/menu-recommend
// Accepts { event_type, headcount, dietary_restrictions?, budget_per_person?, cuisine_preference?, currency? }
// Returns AI-suggested menu options + per-guest cost analysis
router.post('/menu-recommend', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { event_type, headcount, dietary_restrictions, budget_per_person, cuisine_preference, currency } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type is required' });
    if (!headcount) return res.status(400).json({ error: 'headcount is required' });

    const prompt = `You are an expert event caterer. Build a menu recommendation.

Event type: ${event_type}
Headcount: ${headcount}
Cuisine preference: ${cuisine_preference || 'open'}
Dietary restrictions: ${dietary_restrictions || 'none'}
Budget per person: ${budget_per_person || 'not specified'} ${currency || 'USD'}

Return JSON only with this shape:
{
  "currency": "${currency || 'USD'}",
  "headcount": ${headcount},
  "menu_options": [
    {
      "name": "...",
      "style": "<plated|buffet|family-style|stations>",
      "courses": [{"course": "...", "items": ["..."], "dietary_tags": ["..."]}],
      "estimated_cost_per_person": <number>,
      "estimated_total_cost": <number>,
      "rationale": "..."
    }
  ],
  "dietary_coverage": ["..."],
  "beverage_pairings": ["..."],
  "warnings": ["..."],
  "summary": "<short narrative>"
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No menu generated';

    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }

    const analysisId = await persistAnalysis(pool, req.user?.id, 'menu-recommend', null, content, response.model);
    res.json({ menu: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/vendor-recommend
// Accepts { event_type, headcount, services_needed?, budget?, location?, quality_tier? }
// Returns vendor archetypes + interview questions
router.post('/vendor-recommend', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { event_type, headcount, services_needed, budget, location, quality_tier } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type is required' });

    const prompt = `You are a seasoned event procurement consultant. Recommend vendor archetypes.

Event type: ${event_type}
Headcount: ${headcount || 'not specified'}
Services needed: ${services_needed || 'not specified'}
Budget: ${budget || 'not specified'}
Location: ${location || 'not specified'}
Quality tier: ${quality_tier || 'mid-range'}

Return JSON only with this shape:
{
  "event_type": "${event_type}",
  "vendor_archetypes": [
    {
      "service_type": "...",
      "must_have_attributes": ["..."],
      "nice_to_have_attributes": ["..."],
      "expected_cost_range": "...",
      "interview_questions": ["..."],
      "red_flags": ["..."]
    }
  ],
  "sourcing_strategy": ["..."],
  "negotiation_tips": ["..."],
  "summary": "<short narrative>"
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No recommendations generated';

    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }

    const analysisId = await persistAnalysis(pool, req.user?.id, 'vendor-recommend', null, content, response.model);
    res.json({ recommendations: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/guest-list-optimize
// Accepts { event_type, event_goals, max_guests?, current_list_size?, budget_constraint? }
// Returns guest-list rationale and prioritization
router.post('/guest-list-optimize', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { event_type, event_goals, max_guests, current_list_size, budget_constraint } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type is required' });
    if (!event_goals) return res.status(400).json({ error: 'event_goals is required' });

    const prompt = `You are an expert event strategist. Build a guest-list prioritization plan.

Event type: ${event_type}
Event goals: ${event_goals}
Max guests target: ${max_guests || 'not specified'}
Current list size: ${current_list_size || 'unknown'}
Budget constraint: ${budget_constraint || 'not specified'}

Return JSON only with this shape:
{
  "event_type": "${event_type}",
  "priority_tiers": [
    {
      "tier": "<must-invite|should-invite|optional>",
      "criteria": "...",
      "approximate_count_guidance": <number>,
      "examples_of_who_belongs_here": ["..."],
      "examples_of_who_does_not": ["..."]
    }
  ],
  "trim_strategies": ["..."],
  "expand_strategies": ["..."],
  "rsvp_buffer_recommendation": {"expected_decline_pct": <number>, "padding_recommendation": <number>},
  "diversity_balance_notes": ["..."],
  "summary": "<short narrative>"
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No optimization generated';

    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }

    const analysisId = await persistAnalysis(pool, req.user?.id, 'guest-list-optimize', null, content, response.model);
    res.json({ optimization: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// Apply pass 5 wave-1 (additive) — decor-suggest + feedback-summarize
// =====================================================================

// POST /api/ai/decor-suggest
//   body: { event_type, theme?, color_scheme?, season?, headcount? }
router.post('/decor-suggest', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { event_type, theme, color_scheme, season, headcount } = req.body || {};
    if (!event_type) return res.status(400).json({ error: 'event_type is required' });

    const prompt = `You are a senior event decor designer. Create a decor / mood-board concept.
Event type: ${event_type}
Theme: ${theme || 'unspecified'}
Color scheme: ${color_scheme || 'unspecified'}
Season: ${season || 'any'}
Headcount: ${headcount || 'any'}

Return strict JSON:
{
  "concept_name": "<2-4 words>",
  "palette": [{"name": "<color name>", "hex": "#rrggbb", "use": "<primary|accent|background>"}],
  "key_decor_elements": [{"item": "...", "placement": "...", "estimated_cost_per_unit": <number>, "qty": <number>}],
  "lighting_plan": "<2-3 sentences>",
  "table_styling": "<2-3 sentences>",
  "florals": [{"name": "<flower>", "season_match": <true|false>, "alternative": "<flower>"}],
  "must_haves": ["..."],
  "avoid": ["..."],
  "estimated_total_decor_budget_low": <number>,
  "estimated_total_decor_budget_high": <number>
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No decor concept generated';
    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }
    const analysisId = await persistAnalysis(pool, req.user?.id, 'decor-suggest', null, content, response.model);
    res.json({ decor: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/feedback-summarize
//   body: { event_id?, feedback?: [{ rating: 1-5, comment?: string, dimension?: string }] }
//   If feedback omitted and event_id provided, attempts to read from rsvp/guests notes.
router.post('/feedback-summarize', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { event_id, feedback } = req.body || {};
    let items = Array.isArray(feedback) ? feedback : null;

    if (!items && event_id) {
      try {
        // Try a feedback table; tolerant if it doesn't exist
        const r = await pool.query(
          'SELECT rating, comment FROM event_feedback WHERE event_id = $1 LIMIT 500',
          [event_id]
        );
        items = r.rows;
      } catch {
        // fallback to guest notes
        try {
          const r2 = await pool.query(
            "SELECT 0 AS rating, notes AS comment FROM guests WHERE event_id = $1 AND notes IS NOT NULL AND notes <> '' LIMIT 200",
            [event_id]
          );
          items = r2.rows;
        } catch { items = []; }
      }
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'feedback array (or event_id with rows in event_feedback / guests.notes) is required' });
    }

    // Pre-compute deterministic stats
    const ratings = items.filter(i => Number.isFinite(parseFloat(i.rating))).map(i => parseFloat(i.rating));
    const avg = ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : null;
    const stats = {
      response_count: items.length,
      rating_count: ratings.length,
      avg_rating: avg,
      min_rating: ratings.length ? Math.min(...ratings) : null,
      max_rating: ratings.length ? Math.max(...ratings) : null,
    };

    const sample = JSON.stringify(items.slice(0, 80)).substring(0, 6000);

    const prompt = `You are a post-event analytics specialist. Summarize feedback into themes, sentiment, and recommendations.
DETERMINISTIC_STATS: ${JSON.stringify(stats)}
FEEDBACK_SAMPLE (up to 80 items):
${sample}

Return strict JSON:
{
  "overall_sentiment": "positive|neutral|negative|mixed",
  "top_themes": [{"theme": "...", "mention_count_estimate": <number>, "sentiment": "positive|neutral|negative"}],
  "improvement_recommendations": [{"action": "...", "rationale": "..."}],
  "praise_highlights": ["..."],
  "complaints": ["..."],
  "narrative": "<3-5 sentences>"
}`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No summary generated';
    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return { raw: content }; } })() : { raw: content };
    }
    const analysisId = await persistAnalysis(pool, req.user?.id, 'feedback-summarize', event_id || null, content, response.model);
    res.json({ stats, summary: parsed, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setDeps };
