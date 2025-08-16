import { useEffect, useMemo, useState } from 'react';
import { getJSON } from './api';
import Heatmap from './Heatmap';

/* ---------- time helpers ---------- */
function toISO(d) { return d.toISOString(); }
function now() { return new Date(); }
function hoursAgo(h) { return new Date(Date.now() - h * 3600 * 1000); }
function daysAgo(d) { return new Date(Date.now() - d * 24 * 3600 * 1000); }

/* ---------- presets ---------- */
const presets = [
  { key: '1h',  label: 'Last 1h',  range: () => [hoursAgo(1), now()] },
  { key: '24h', label: 'Last 24h', range: () => [daysAgo(1), now()] },
  { key: '7d',  label: 'Last 7d',  range: () => [daysAgo(7), now()] },
  { key: 'all', label: 'All time', range: () => [null, null] },
];

/* ---------- csv helpers ---------- */
function toCSV(rows, headers) {
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(','));
  return lines.join('\n');
}

function downloadCSV(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [preset, setPreset] = useState('24h');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [eventFilter, setEventFilter] = useState('');

  const [stats, setStats] = useState(null);
  const [points, setPoints] = useState([]);
  const [feedback, setFeedback] = useState([]);

  // compute effective from/to from preset
  const [effFrom, effTo] = useMemo(() => {
    const p = presets.find(p => p.key === preset)?.range() || [null, null];
    return [from ?? p[0], to ?? p[1]];
  }, [preset, from, to]);

  // build query string; can pass extra params to override/add
  function query(extra = {}) {
    const q = new URLSearchParams();
    if (effFrom) q.set('from', toISO(effFrom));
    if (effTo)   q.set('to',   toISO(effTo));
    if (eventFilter) q.set('event', eventFilter); // used by /api/stats
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, v);
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  async function load() {
    const s = await getJSON(`/api/stats${query()}`);
    setStats(s);
    const p = await getJSON(`/api/heatmap${query()}`);
    setPoints(p);
    const f = await getJSON(`/api/feedback${query()}`);
    setFeedback(f);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [preset, effFrom, effTo, eventFilter]);

  const aSessions = stats?.sessionsByVariant.find(x => x._id === 'A')?.sessions || 0;
  const bSessions = stats?.sessionsByVariant.find(x => x._id === 'B')?.sessions || 0;
  const aConv = stats?.conversionsByVariant.find(x => x._id === 'A')?.conversions || 0;
  const bConv = stats?.conversionsByVariant.find(x => x._id === 'B')?.conversions || 0;
  const aRate = aSessions ? (aConv / aSessions) * 100 : 0;
  const bRate = bSessions ? (bConv / bSessions) * 100 : 0;

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3>Filters</h3>
        <div className="row" style={{ alignItems:'flex-end', gap: 12 }}>
          {/* Preset buttons */}
          <div className="row" style={{ gap: 8 }}>
            {presets.map(p => (
              <button
                key={p.key}
                className={`btn ${preset===p.key ? 'primary' : ''}`}
                onClick={() => { setPreset(p.key); setFrom(null); setTo(null); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Event filter (affects the first table /stats?event=...) */}
          <div style={{ minWidth: 220 }}>
            <div className="label">Event filter</div>
            <select className="select" value={eventFilter} onChange={e=>setEventFilter(e.target.value)}>
              <option value="">(all events)</option>
              <option value="session_started">session_started</option>
              <option value="page_click">page_click</option>
              <option value="cta_clicked">cta_clicked</option>
              <option value="secondary_clicked">secondary_clicked</option>
            </select>
          </div>

          {/* Manual from/to (optional) */}
          <div>
            <div className="label">From (ISO)</div>
            <input className="input" placeholder="2025-08-16T00:00:00.000Z"
              value={effFrom ? toISO(effFrom) : ''} onChange={e=>setFrom(e.target.value? new Date(e.target.value) : null)} />
          </div>
          <div>
            <div className="label">To (ISO)</div>
            <input className="input" placeholder="2025-08-16T23:59:59.999Z"
              value={effTo ? toISO(effTo) : ''} onChange={e=>setTo(e.target.value? new Date(e.target.value) : null)} />
          </div>

          <button className="btn" onClick={load}>Refresh</button>

          {/* ---- CSV Export Buttons ---- */}
          <button
            className="btn"
            onClick={async () => {
              // Export filtered feedback using /api/feedback with current time window
              const data = await getJSON(`/api/feedback${query()}`);
              const rows = data.map(d => ({
                rating: d.rating,
                text: d.text,
                sessionId: d.sessionId,
                createdAt: d.createdAt,
              }));
              const csv = toCSV(rows, ['rating','text','sessionId','createdAt']);
              downloadCSV(`feedback_${Date.now()}.csv`, csv);
            }}
          >
            Export Feedback CSV
          </button>

          <button
            className="btn"
            onClick={async () => {
              // Export filtered events using /api/events
              // NOTE: server expects "name" (not "event") for event name filter
              const qs = query(eventFilter ? { name: eventFilter } : {});
              const data = await getJSON(`/api/events${qs}`);
              const rows = data.map(d => ({
                sessionId: d.sessionId,
                variant: d.variant,
                name: d.name,
                x: d.x,
                y: d.y,
                meta: d.meta,         // JSON stringified by toCSV
                createdAt: d.createdAt,
              }));
              const csv = toCSV(rows, ['sessionId','variant','name','x','y','meta','createdAt']);
              downloadCSV(`events_${Date.now()}.csv`, csv);
            }}
          >
            Export Events CSV
          </button>
        </div>

        <p className="small">
          Tip: pick a preset, or type exact ISO datetimes to override. Event filter narrows the first table,
          and is also applied to the Events CSV (as <code>name</code>).
        </p>
      </div>

      <div className="card">
        <h3>Events (by name)</h3>
        <table className="table">
          <thead><tr><th>Event</th><th>Count</th></tr></thead>
          <tbody>
            {stats?.eventsByName?.map((e) => (
              <tr key={e._id}><td>{e._id}</td><td>{e.count}</td></tr>
            )) || <tr><td colSpan="2">Loading…</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>A/B Summary</h3>
        <div className="row">
          <div>
            <div className="label">Variant A</div>
            <div>Sessions: <b>{aSessions}</b></div>
            <div>Conversions: <b>{aConv}</b></div>
            <div>Conv. Rate: <b>{aRate.toFixed(1)}%</b></div>
          </div>
          <div>
            <div className="label">Variant B</div>
            <div>Sessions: <b>{bSessions}</b></div>
            <div>Conversions: <b>{bConv}</b></div>
            <div>Conv. Rate: <b>{bRate.toFixed(1)}%</b></div>
          </div>
        </div>
        <p className="small">Conversion = clicks on the primary CTA.</p>
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3>Heatmap (filtered)</h3>
        <div className="canvas-wrap" style={{ position: 'relative' }}>
          <Heatmap points={points} width={900} height={506} />
        </div>
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3>Recent Feedback</h3>
        <table className="table">
          <thead><tr><th>Rating</th><th>Text</th><th>When</th></tr></thead>
          <tbody>
            {feedback.map(f => (
              <tr key={f._id}>
                <td>{f.rating ?? '—'}</td>
                <td>{f.text || '—'}</td>
                <td className="small">{new Date(f.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}