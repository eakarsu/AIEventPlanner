require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');

// ==================== JWT SECRET GUARD ====================
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// ==================== CORS ====================
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ==================== AUTH MIDDLEWARE ====================
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== RATE LIMITER ====================
const { aiRateLimiter } = require('./middleware/rateLimiter');

// ==================== OPENROUTER ====================
function callOpenRouter(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    });

    const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const apiUrl = new URL(`${baseUrl}/chat/completions`);
    const options = {
      hostname: apiUrl.hostname,
      port: apiUrl.port || undefined,
      path: `${apiUrl.pathname}${apiUrl.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Event Planner',
      },
    };

    const transport = apiUrl.protocol === 'http:' ? http : https;
    const req = transport.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ==================== AI PERSISTENCE HELPER ====================
async function persistAnalysis(userId, analysisType, eventId, content, model) {
  const result = await pool.query(
    `INSERT INTO ai_analyses (user_id, analysis_type, event_id, content, model)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, analysisType, eventId, content, model]
  );
  return result.rows[0].id;
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hash, name]
    );
    const token = jwt.sign({ id: result.rows[0].id, email, role: result.rows[0].role || 'planner' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: result.rows[0], token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: result.rows[0].id, email, role: result.rows[0].role || 'planner' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { id: result.rows[0].id, email: result.rows[0].email, name: result.rows[0].name }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ==================== GENERIC CRUD HELPER ====================
function createCrudRoutes(tableName, routePath) {
  // GET ALL (with pagination)
  const hasPagination = ['events', 'guests', 'vendors'].includes(tableName);
  app.get(`/api/${routePath}`, authenticate, async (req, res) => {
    try {
      if (hasPagination) {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const total = parseInt(countResult.rows[0].count);
        const result = await pool.query(
          `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        return res.json({
          data: result.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      }
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET ONE
  app.get(`/api/${routePath}/:id`, authenticate, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE
  app.delete(`/api/${routePath}/:id`, authenticate, async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ==================== EVENTS ====================
createCrudRoutes('events', 'events');

app.post('/api/events', authenticate, async (req, res) => {
  try {
    const { name, event_type, date, time, location, description, max_guests, budget, status } = req.body;
    // Input validation
    if (!name || !event_type || !date) {
      return res.status(400).json({ error: 'name, event_type, and date are required' });
    }
    const result = await pool.query(
      `INSERT INTO events (name, event_type, date, time, location, description, max_guests, budget, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, event_type, date, time, location, description, max_guests, budget, status || 'Planning']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', authenticate, async (req, res) => {
  try {
    const { name, event_type, date, time, location, description, max_guests, budget, status } = req.body;
    const result = await pool.query(
      `UPDATE events SET name=$1, event_type=$2, date=$3, time=$4, location=$5, description=$6, max_guests=$7, budget=$8, status=$9 WHERE id=$10 RETURNING *`,
      [name, event_type, date, time, location, description, max_guests, budget, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== VENUES ====================
createCrudRoutes('venues', 'venues');

app.post('/api/venues', authenticate, async (req, res) => {
  try {
    const { name, address, capacity, venue_type, hourly_rate, amenities, contact_phone, contact_email, rating } = req.body;
    const result = await pool.query(
      `INSERT INTO venues (name, address, capacity, venue_type, hourly_rate, amenities, contact_phone, contact_email, rating)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, address, capacity, venue_type, hourly_rate, amenities, contact_phone, contact_email, rating]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/venues/:id', authenticate, async (req, res) => {
  try {
    const { name, address, capacity, venue_type, hourly_rate, amenities, contact_phone, contact_email, rating } = req.body;
    const result = await pool.query(
      `UPDATE venues SET name=$1, address=$2, capacity=$3, venue_type=$4, hourly_rate=$5, amenities=$6, contact_phone=$7, contact_email=$8, rating=$9 WHERE id=$10 RETURNING *`,
      [name, address, capacity, venue_type, hourly_rate, amenities, contact_phone, contact_email, rating, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== GUESTS ====================
createCrudRoutes('guests', 'guests');

app.post('/api/guests', authenticate, async (req, res) => {
  try {
    const { name, email, phone, event_id, rsvp_status, dietary_restrictions, plus_ones, table_number, notes } = req.body;
    // Input validation
    if (!name || !event_id) {
      return res.status(400).json({ error: 'name and event_id are required' });
    }
    const result = await pool.query(
      `INSERT INTO guests (name, email, phone, event_id, rsvp_status, dietary_restrictions, plus_ones, table_number, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, email, phone, event_id, rsvp_status || 'Pending', dietary_restrictions, plus_ones || 0, table_number, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/guests/:id', authenticate, async (req, res) => {
  try {
    const { name, email, phone, event_id, rsvp_status, dietary_restrictions, plus_ones, table_number, notes } = req.body;
    const result = await pool.query(
      `UPDATE guests SET name=$1, email=$2, phone=$3, event_id=$4, rsvp_status=$5, dietary_restrictions=$6, plus_ones=$7, table_number=$8, notes=$9 WHERE id=$10 RETURNING *`,
      [name, email, phone, event_id, rsvp_status, dietary_restrictions, plus_ones, table_number, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CATERING MENUS ====================
createCrudRoutes('catering_menus', 'catering');

app.post('/api/catering', authenticate, async (req, res) => {
  try {
    const { name, cuisine_type, price_per_person, min_guests, max_guests, menu_items, dietary_options, vendor_name, rating } = req.body;
    const result = await pool.query(
      `INSERT INTO catering_menus (name, cuisine_type, price_per_person, min_guests, max_guests, menu_items, dietary_options, vendor_name, rating)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, cuisine_type, price_per_person, min_guests, max_guests, menu_items, dietary_options, vendor_name, rating]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/catering/:id', authenticate, async (req, res) => {
  try {
    const { name, cuisine_type, price_per_person, min_guests, max_guests, menu_items, dietary_options, vendor_name, rating } = req.body;
    const result = await pool.query(
      `UPDATE catering_menus SET name=$1, cuisine_type=$2, price_per_person=$3, min_guests=$4, max_guests=$5, menu_items=$6, dietary_options=$7, vendor_name=$8, rating=$9 WHERE id=$10 RETURNING *`,
      [name, cuisine_type, price_per_person, min_guests, max_guests, menu_items, dietary_options, vendor_name, rating, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== VENDORS ====================
createCrudRoutes('vendors', 'vendors');

app.post('/api/vendors', authenticate, async (req, res) => {
  try {
    const { name, service_type, contact_email, contact_phone, hourly_rate, rating, description, availability, portfolio_url } = req.body;
    // Input validation
    if (!name || !service_type) {
      return res.status(400).json({ error: 'name and service_type are required' });
    }
    const result = await pool.query(
      `INSERT INTO vendors (name, service_type, contact_email, contact_phone, hourly_rate, rating, description, availability, portfolio_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, service_type, contact_email, contact_phone, hourly_rate, rating, description, availability || 'Available', portfolio_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vendors/:id', authenticate, async (req, res) => {
  try {
    const { name, service_type, contact_email, contact_phone, hourly_rate, rating, description, availability, portfolio_url } = req.body;
    const result = await pool.query(
      `UPDATE vendors SET name=$1, service_type=$2, contact_email=$3, contact_phone=$4, hourly_rate=$5, rating=$6, description=$7, availability=$8, portfolio_url=$9 WHERE id=$10 RETURNING *`,
      [name, service_type, contact_email, contact_phone, hourly_rate, rating, description, availability, portfolio_url, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BUDGETS ====================
createCrudRoutes('budgets', 'budgets');

app.post('/api/budgets', authenticate, async (req, res) => {
  try {
    const { event_id, category, estimated_cost, actual_cost, vendor_name, notes, status } = req.body;
    const result = await pool.query(
      `INSERT INTO budgets (event_id, category, estimated_cost, actual_cost, vendor_name, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [event_id, category, estimated_cost, actual_cost || 0, vendor_name, notes, status || 'Pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/budgets/:id', authenticate, async (req, res) => {
  try {
    const { event_id, category, estimated_cost, actual_cost, vendor_name, notes, status } = req.body;
    const result = await pool.query(
      `UPDATE budgets SET event_id=$1, category=$2, estimated_cost=$3, actual_cost=$4, vendor_name=$5, notes=$6, status=$7 WHERE id=$8 RETURNING *`,
      [event_id, category, estimated_cost, actual_cost, vendor_name, notes, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TASKS ====================
createCrudRoutes('tasks', 'tasks');

app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { event_id, title, description, assigned_to, due_date, priority, status } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (event_id, title, description, assigned_to, due_date, priority, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [event_id, title, description, assigned_to, due_date, priority || 'Medium', status || 'Pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { event_id, title, description, assigned_to, due_date, priority, status } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET event_id=$1, title=$2, description=$3, assigned_to=$4, due_date=$5, priority=$6, status=$7 WHERE id=$8 RETURNING *`,
      [event_id, title, description, assigned_to, due_date, priority, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== INVITATIONS ====================
createCrudRoutes('invitations', 'invitations');

app.post('/api/invitations', authenticate, async (req, res) => {
  try {
    const { event_id, guest_name, guest_email, invitation_type, sent_date, rsvp_status, message } = req.body;
    const result = await pool.query(
      `INSERT INTO invitations (event_id, guest_name, guest_email, invitation_type, sent_date, rsvp_status, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [event_id, guest_name, guest_email, invitation_type || 'Email', sent_date, rsvp_status || 'Pending', message]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invitations/:id', authenticate, async (req, res) => {
  try {
    const { event_id, guest_name, guest_email, invitation_type, sent_date, rsvp_status, message } = req.body;
    const result = await pool.query(
      `UPDATE invitations SET event_id=$1, guest_name=$2, guest_email=$3, invitation_type=$4, sent_date=$5, rsvp_status=$6, message=$7 WHERE id=$8 RETURNING *`,
      [event_id, guest_name, guest_email, invitation_type, sent_date, rsvp_status, message, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SEATING ====================
createCrudRoutes('seating', 'seating');

app.post('/api/seating', authenticate, async (req, res) => {
  try {
    const { event_id, table_number, table_name, capacity, guests_assigned, arrangement_type, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO seating (event_id, table_number, table_name, capacity, guests_assigned, arrangement_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [event_id, table_number, table_name, capacity, guests_assigned, arrangement_type || 'Round', notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/seating/:id', authenticate, async (req, res) => {
  try {
    const { event_id, table_number, table_name, capacity, guests_assigned, arrangement_type, notes } = req.body;
    const result = await pool.query(
      `UPDATE seating SET event_id=$1, table_number=$2, table_name=$3, capacity=$4, guests_assigned=$5, arrangement_type=$6, notes=$7 WHERE id=$8 RETURNING *`,
      [event_id, table_number, table_name, capacity, guests_assigned, arrangement_type, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ENTERTAINMENT ====================
createCrudRoutes('entertainment', 'entertainment');

app.post('/api/entertainment', authenticate, async (req, res) => {
  try {
    const { name, entertainment_type, duration_hours, cost, description, requirements, contact_info, rating } = req.body;
    const result = await pool.query(
      `INSERT INTO entertainment (name, entertainment_type, duration_hours, cost, description, requirements, contact_info, rating)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, entertainment_type, duration_hours, cost, description, requirements, contact_info, rating]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/entertainment/:id', authenticate, async (req, res) => {
  try {
    const { name, entertainment_type, duration_hours, cost, description, requirements, contact_info, rating } = req.body;
    const result = await pool.query(
      `UPDATE entertainment SET name=$1, entertainment_type=$2, duration_hours=$3, cost=$4, description=$5, requirements=$6, contact_info=$7, rating=$8 WHERE id=$9 RETURNING *`,
      [name, entertainment_type, duration_hours, cost, description, requirements, contact_info, rating, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AI ROUTES (OpenRouter) ====================

// AI Event Suggestions
app.post('/api/ai/event-suggestions', authenticate, aiRateLimiter, async (req, res) => {
  try {
    const { event_type, guest_count, budget, season, preferences } = req.body;
    const prompt = `You are an expert event planner. Generate creative and detailed event suggestions based on these requirements:
- Event Type: ${event_type || 'Any'}
- Expected Guests: ${guest_count || 'Not specified'}
- Budget: $${budget || 'Flexible'}
- Season/Time: ${season || 'Any season'}
- Preferences: ${preferences || 'None specified'}

Provide 5 detailed event suggestions. For each suggestion include:
1. Event Name
2. Theme & Concept
3. Estimated Budget Breakdown
4. Key Activities
5. Recommended Venue Type
6. Timeline Overview
7. Why This Works

Format each suggestion clearly with headers.`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No suggestions generated';
    const analysisId = await persistAnalysis(req.user?.id, 'event-suggestions', null, content, response.model);
    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Menu Generator
app.post('/api/ai/menu-generator', authenticate, aiRateLimiter, async (req, res) => {
  try {
    const { cuisine, guest_count, budget_per_person, dietary_needs, course_count, event_type } = req.body;
    const prompt = `You are a professional chef and catering consultant. Create a complete menu for an event:
- Cuisine: ${cuisine || 'International'}
- Guest Count: ${guest_count || 50}
- Budget per Person: $${budget_per_person || 50}
- Dietary Requirements: ${dietary_needs || 'Standard'}
- Number of Courses: ${course_count || 3}
- Event Type: ${event_type || 'Formal dinner'}

Create a detailed menu including:
1. Each course with dish names and descriptions
2. Ingredient highlights
3. Wine/beverage pairings
4. Dietary accommodation alternatives
5. Estimated cost per dish
6. Preparation timeline
7. Presentation suggestions

Make it creative and appetizing.`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No menu generated';
    const analysisId = await persistAnalysis(req.user?.id, 'menu-generator', null, content, response.model);
    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Budget Optimizer
app.post('/api/ai/budget-optimizer', authenticate, aiRateLimiter, async (req, res) => {
  try {
    const { total_budget, guest_count, event_type, priorities, current_allocations } = req.body;
    const prompt = `You are a financial advisor specializing in event planning. Optimize this event budget:
- Total Budget: $${total_budget || 10000}
- Guest Count: ${guest_count || 50}
- Event Type: ${event_type || 'Corporate event'}
- Priorities: ${priorities || 'Quality food and entertainment'}
- Current Allocations: ${current_allocations || 'Not yet allocated'}

Provide:
1. Optimal Budget Allocation (percentages and amounts for each category)
2. Cost-Saving Opportunities
3. Areas Where Spending More Adds Value
4. Risk Areas to Watch
5. Vendor Negotiation Tips
6. Hidden Costs to Consider
7. Budget Timeline (when to pay what)
8. Comparison: Budget vs Premium vs Economy options

Be specific with dollar amounts and percentages.`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No optimization generated';
    const analysisId = await persistAnalysis(req.user?.id, 'budget-optimizer', null, content, response.model);
    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Schedule Optimizer
app.post('/api/ai/schedule-optimizer', authenticate, aiRateLimiter, async (req, res) => {
  try {
    const { event_type, duration_hours, activities, guest_count, start_time } = req.body;
    const prompt = `You are an expert event coordinator. Create an optimized schedule for this event:
- Event Type: ${event_type || 'Conference'}
- Duration: ${duration_hours || 8} hours
- Activities to Include: ${activities || 'Keynotes, networking, meals, workshops'}
- Guest Count: ${guest_count || 100}
- Start Time: ${start_time || '9:00 AM'}

Create a detailed minute-by-minute schedule including:
1. Complete Timeline with exact times
2. Activity descriptions and durations
3. Setup/teardown buffers
4. Break optimization
5. Guest flow management
6. Contingency time slots
7. Staff assignments per time block
8. Technology/AV requirements per segment

Make it professional and realistic.`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No schedule generated';
    const analysisId = await persistAnalysis(req.user?.id, 'schedule-optimizer', null, content, response.model);
    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Vendor Matcher
app.post('/api/ai/vendor-matcher', authenticate, aiRateLimiter, async (req, res) => {
  try {
    const { event_type, services_needed, budget, location, quality_preference } = req.body;
    const prompt = `You are a vendor relationship manager for events. Recommend ideal vendor types and selection criteria:
- Event Type: ${event_type || 'Wedding'}
- Services Needed: ${services_needed || 'Catering, Photography, Music, Flowers'}
- Budget Range: $${budget || '5000-15000'}
- Location: ${location || 'Urban area'}
- Quality Preference: ${quality_preference || 'High quality'}

Provide:
1. Recommended Vendor Categories with priority ranking
2. What to Look For in each vendor type
3. Red Flags to Avoid
4. Questions to Ask Each Vendor
5. Contract Must-Haves
6. Estimated Cost Ranges per vendor type
7. Timeline for Booking (how far in advance)
8. Backup Vendor Strategy

Be thorough and actionable.`;

    const response = await callOpenRouter(prompt);
    const content = response.choices?.[0]?.message?.content || 'No recommendations generated';
    const analysisId = await persistAnalysis(req.user?.id, 'vendor-matcher', null, content, response.model);
    res.json({ result: content, analysis_id: analysisId, model: response.model, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI ROUTES ====================
const { router: aiNewRouter, setDeps: setAiNewDeps } = require('./routes/aiNew');
setAiNewDeps(pool, callOpenRouter);
// Routes: /api/ai/seating-optimizer, /api/ai/budget-variance, /api/ai/post-event-summary
app.use('/api/ai', authenticate, aiNewRouter);

// ==================== INTEGRATIONS (apply pass 5) ====================
// Vendor marketplace, hybrid streaming (gated on STREAMING_PROVIDER_API_KEY),
// day-of coordination — additive only, see routes/integrations.js
const { router: integrationsRouter, setPool: setIntegrationsPool } = require('./routes/integrations');
setIntegrationsPool(pool);
app.use('/api/integrations', authenticate, integrationsRouter);

// ==================== RSVP ROUTES ====================
// generate-link is authenticated; token GET/POST endpoints are public
const { router: rsvpRouter, setPool: setRsvpPool } = require('./routes/rsvp');
setRsvpPool(pool);
app.use('/api/rsvp', (req, res, next) => {
  // Require auth only for generate-link
  if (req.method === 'POST' && req.path === '/generate-link') {
    return authenticate(req, res, next);
  }
  next();
}, rsvpRouter);
const _aec = require('./routes/agenticEventCoordinator'); _aec.setDeps(pool, callOpenRouter); app.use('/api/agentic-event-coordinator', authenticate, _aec.router);
const _ds = require('./routes/decorSuggestions'); _ds.setDeps(pool, callOpenRouter); app.use('/api/decor-suggestions', authenticate, _ds.router);
const _rgm = require('./routes/realtimeGuestManager'); _rgm.setPool(pool); app.use('/api/realtime-guest-manager', authenticate, _rgm.router);
const _vm = require('./routes/vendorMarketplace'); _vm.setPool(pool); app.use('/api/vendor-marketplace', authenticate, _vm.router);
const _doc = require('./routes/dayOfCoordinator'); _doc.setPool(pool); app.use('/api/day-of-coordinator', authenticate, _doc.router);
const _pea = require('./routes/postEventAnalytics'); _pea.setPool(pool); app.use('/api/post-event-analytics', authenticate, _pea.router);
const _hei = require('./routes/hybridEventIntegration'); _hei.setPool(pool); app.use('/api/hybrid-event', authenticate, _hei.router);
const _gec = require('./routes/governedEventControl'); _gec.setPool(pool); app.use('/api/governed-event-control', authenticate, _gec);

// ==================== DASHBOARD ====================
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    const events = await pool.query('SELECT COUNT(*) FROM events');
    const venues = await pool.query('SELECT COUNT(*) FROM venues');
    const guests = await pool.query('SELECT COUNT(*) FROM guests');
    const vendors = await pool.query('SELECT COUNT(*) FROM vendors');
    const tasks = await pool.query('SELECT COUNT(*) FROM tasks');
    const budgetTotal = await pool.query('SELECT COALESCE(SUM(estimated_cost), 0) as total FROM budgets');

    res.json({
      totalEvents: parseInt(events.rows[0].count),
      totalVenues: parseInt(venues.rows[0].count),
      totalGuests: parseInt(guests.rows[0].count),
      totalVendors: parseInt(vendors.rows[0].count),
      totalTasks: parseInt(tasks.rows[0].count),
      totalBudget: parseFloat(budgetTotal.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// === Custom Views (4 endpoints) — mount BEFORE any 404 catch-all ===
try {
  const _cv = require('./routes/customViews');
  _cv.setPool(pool);
  app.use('/api/custom-views', authenticate, _cv.router);
} catch (_e) { console.error('customViews mount failed:', _e.message); }

app.listen(PORT, () => {
  console.log(`AI Event Planner API running on port ${PORT}`);
});
