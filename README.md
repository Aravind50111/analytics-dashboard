"**Problem**: Need to capture user interactions and feedback for UX improvements. **Tasks**: Create analytics event tracking; Add user feedback collection; Store events in MongoDB; Create analytics dashboard; Add heatmap tracking; Implement A/B testing framework. **Acceptance Criteria**: User events tracked and stored; Feedback collection integrated; Analytics dashboard available."



Analytics Demo — Events, Feedback, Heatmap, A/B

A tiny end-to-end demo that tracks user events and feedback, stores them in MongoDB Atlas, and shows an analytics dashboard with A/B testing and a click heatmap. Includes CSV export.

✨ Features

Event tracking (session_started, page_click with x/y, cta_clicked, etc.)

Feedback collection (rating + text)

MongoDB storage (Atlas or local Mongo)

Analytics dashboard (event counts, A/B sessions & conversions, heatmap, recent feedback)

Time-range filters (Last 1h / 24h / 7d / All time), event filter

CSV export (Events & Feedback)

Demo data seeder (dev-only)

🧱 Project Structure
analytics-demo/
│
├─ server/                  # Backend (Node + Express + MongoDB)
│  ├─ server.js
│  ├─ package.json
│  └─ .env                  # contains MONGODB_URI and PORT (DO NOT COMMIT)
│
└─ client/                  # Frontend (React + Vite)
   ├─ index.html
   ├─ vite.config.js
   └─ src/
      ├─ App.jsx
      ├─ main.jsx
      ├─ index.css
      ├─ analytics.js
      ├─ api.js
      ├─ Dashboard.jsx
      └─ Heatmap.jsx

🔧 Prerequisites

Node.js 18+ (check: node -v)

Git (optional, for pushing to GitHub)

A MongoDB Atlas cluster (free M0 is fine)

🗝️ Set up MongoDB Atlas (one-time)

Create a free cluster (M0) in Atlas.

Database Access → Add user (e.g., appuser / password).

For fewer issues, use an alphanumeric password (or URL-encode special chars).

Network Access → Add IP: 0.0.0.0/0 (allow all for dev; lock down later).

Connect → Drivers → Node.js → copy the connection string (starts with mongodb+srv://...).

If your network blocks SRV (mongodb+srv://), use the Standard connection string (mongodb://host1,host2,host3/...).

⚙️ Configure the server

Create server/.env:

PORT=4000
# Use your real Atlas URI; NO angle brackets; URL-encode special chars if any
MONGODB_URI=mongodb+srv://appuser:YourPassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority


If running a local MongoDB instead, use:
MONGODB_URI=mongodb://127.0.0.1:27017

▶ Run the project locally

Open two terminals:

Terminal A — Backend API
cd path\to\analytics-demo\server
npm install
node server.js


You should see:

✅ MongoDB connected
🚀 Server on http://localhost:4000


Health check: http://localhost:4000/api/health → {"ok":true}

Terminal B — Frontend (Vite)
cd path\to\analytics-demo\client
npm install
npm run dev


Open: http://localhost:5173

🎬 Demo Flow

User Demo tab:

Click inside the large box to create heatmap points.

Click the primary CTA (conversion).

Submit feedback (rating + text).

(Optional) Click Seed Fake Data to auto-populate charts.

Analytics Dashboard tab:

Use filters (Last 1h / 24h / 7d / All time, event filter).

See Events by name, A/B sessions/conversions with conversion rate.

Check the Heatmap.

View Recent Feedback.

Export CSV: Feedback and Events (uses current filters).
