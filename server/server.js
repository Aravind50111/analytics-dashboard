// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

/* ---------- Basic Middleware ---------- */
app.use(cors());                 // allow all origins for demo
app.use(express.json());         // parse JSON bodies

/* ---------- Helpful Root ---------- */
app.get('/', (_req, res) => {
  res.send('API running. Try /api/health, /api/stats, /api/heatmap, /api/feedback, /api/events');
});

/* ---------- Env Guard ---------- */
if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}

/* ---------- Mongo ---------- */
mongoose
  .connect(process.env.MONGODB_URI, { dbName: 'analytics_demo' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((e) => console.error('Mongo error', e));

/* ---------- Schemas ---------- */
const EventSchema = new mongoose.Schema(
  {
    sessionId: String,
    variant: { type: String, enum: ['A', 'B'], default: 'A' },
    name: String,     // e.g., 'session_started', 'cta_clicked', 'page_click'
    meta: Object,     // flexible extras
    x: Number,        // relative click x (0..1) for heatmap
    y: Number,        // relative click y (0..1) for heatmap
  },
  { timestamps: true }
);

const FeedbackSchema = new mongoose.Schema(
  {
    sessionId: String,
    rating: Number,
    text: String,
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', EventSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

/* ---------- Tiny logger (only for key endpoints) ---------- */
function logBody(label) {
  return (req, _res, next) => {
    try {
      console.log(label, JSON.stringify(req.body));
    } catch {
      console.log(label, req.body);
    }
    next();
  };
}

/* ---------- Utils ---------- */
function buildTimeMatch(from, to) {
  const m = {};
  if (from || to) m.createdAt = {};
  if (from) m.createdAt.$gte = new Date(from);
  if (to)   m.createdAt.$lte = new Date(to);
  return m;
}

/* ---------- Routes ---------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Track any event
app.post('/api/event', logBody('EVENT:'), async (req, res) => {
  try {
    const { sessionId, variant, name, meta, x, y } = req.body;
    if (!sessionId || !name) {
      return res.status(400).json({ error: 'sessionId and name required' });
    }
    const doc = await Event.create({ sessionId, variant, name, meta, x, y });
    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error('POST /api/event error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Submit feedback
app.post('/api/feedback', logBody('FEEDBACK:'), async (req, res) => {
  try {
    const { sessionId, rating, text } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    await Feedback.create({ sessionId, rating, text });
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/feedback error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Recent feedback (for dashboard) — supports ?from=ISO&to=ISO
app.get('/api/feedback', async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = buildTimeMatch(from, to);
    const items = await Feedback.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Heatmap points — supports ?from=ISO&to=ISO
app.get('/api/heatmap', async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = { ...buildTimeMatch(from, to), x: { $ne: null }, y: { $ne: null } };
    const points = await Event.find(q)
      .sort({ createdAt: -1 })
      .limit(2000)
      .select({ x: 1, y: 1, _id: 0 });
    res.json(points);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stats — supports ?from=ISO&to=ISO&event=name (event = optional filter for first table)
app.get('/api/stats', async (req, res) => {
  try {
    const { from, to, event } = req.query;
    const timeMatch = buildTimeMatch(from, to);

    // Events by name (optionally pre-filter to a specific event)
    const matchAll = { ...timeMatch };
    if (event) matchAll.name = event;

    const eventsByName = await Event.aggregate([
      { $match: matchAll },
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Sessions by variant
    const sessionsMatch = { name: 'session_started', ...timeMatch };
    const sessionsByVariant = await Event.aggregate([
      { $match: sessionsMatch },
      { $group: { _id: '$variant', sessions: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Conversions by variant
    const convMatch = { name: 'cta_clicked', ...timeMatch };
    const conversionsByVariant = await Event.aggregate([
      { $match: convMatch },
      { $group: { _id: '$variant', conversions: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ eventsByName, sessionsByVariant, conversionsByVariant });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// NEW: Raw events for CSV export — supports ?from=ISO&to=ISO&name=&variant=&limit=
app.get('/api/events', async (req, res) => {
  try {
    const { from, to, name, variant, limit = 5000 } = req.query;
    const q = buildTimeMatch(from, to);
    if (name) q.name = name;
    if (variant) q.variant = variant;

    const max = Math.min(Number(limit) || 5000, 20000);
    const rows = await Event.find(q)
      .sort({ createdAt: -1 })
      .limit(max)
      .select({ sessionId:1, variant:1, name:1, meta:1, x:1, y:1, createdAt:1, _id:0 });

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DEMO SEED: generate fake data quickly (don’t ship to prod)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/seed', logBody('SEED:'), async (req, res) => {
    try {
      const count = Number(req.query.count || 40);
      const ops = [];
      for (let i = 0; i < count; i++) {
        const sid = `seed-${Date.now()}-${i}`;
        const variant = Math.random() < 0.5 ? 'A' : 'B';
        ops.push({ sessionId: sid, variant, name: 'session_started' });
        const clicks = Math.floor(3 + Math.random() * 5);
        for (let c = 0; c < clicks; c++) {
          ops.push({
            sessionId: sid,
            variant,
            name: 'page_click',
            x: Math.random(),
            y: Math.random(),
          });
        }
        const didConvert = Math.random() < (variant === 'A' ? 0.55 : 0.45);
        if (didConvert) ops.push({ sessionId: sid, variant, name: 'cta_clicked' });
      }
      await Event.insertMany(ops);
      res.json({ ok: true, inserted: ops.length });
    } catch (e) {
      console.error('POST /api/seed error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}

/* ---------- Start ---------- */
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Server on http://localhost:${port}`));

/* ---------- Safety ---------- */
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION', err);
});