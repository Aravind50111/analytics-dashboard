import { useEffect, useRef, useState } from 'react';
import { initAnalytics, getVariant, track, clickWithPos, submitFeedback } from './analytics';
import Dashboard from './Dashboard';
import './index.css';

export default function App() {
  const [tab, setTab] = useState('demo');
  const [variant, setVariant] = useState('A');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const demoAreaRef = useRef(null);

  useEffect(() => {
    initAnalytics({ containerSelector: '#demo-area' });
    setVariant(getVariant());
  }, []);

  function onCtaClick(e) {
    clickWithPos('cta_clicked', e, { where: 'hero' });
  }

  function onAnyClick(e) {
    clickWithPos('page_click', e, { where: 'demo_area' });
  }

  async function onSendFeedback() {
    await submitFeedback({ rating: Number(rating), text });
    setText('');
    alert('Thanks for the feedback!');
  }

  return (
    <div className="container">
      <div className="tabbar">
        <button className={`tab ${tab==='demo'?'active':''}`} onClick={() => setTab('demo')}>User Demo</button>
        <button className={`tab ${tab==='dashboard'?'active':''}`} onClick={() => setTab('dashboard')}>Analytics Dashboard</button>
      </div>

      {tab === 'demo' ? (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent:'space-between' }}>
              <div>
                <h2 style={{ margin:'0 0 4px' }}>Mini Product Page</h2>
                <div className="badge">Variant {variant}</div>
                <p className="small">A/B is randomly assigned per browser. CTA color/text changes.</p>
              </div>
              <button className="btn" onClick={async () => {
                await fetch('http://localhost:4000/api/seed', { method: 'POST' });
                alert('Seeded random sessions/events.');
              }}>
                Seed Fake Data
              </button>
            </div>

            <div id="demo-area" ref={demoAreaRef} className="canvas-wrap" onClick={onAnyClick}>
              <div className="overlay" style={{ display:'grid', placeItems:'center', padding:24 }}>
                <div style={{ textAlign:'center', maxWidth: 520 }}>
                  <h1 style={{ marginBottom: 8 }}>Build your dream game in minutes</h1>
                  <p className="small" style={{ marginBottom: 16 }}>
                    Click inside this box to create heatmap points, then open the dashboard tab.
                  </p>
                  <div className="row" style={{ justifyContent:'center' }}>
                    <button
                      className={`btn ${variant === 'A' ? 'primary' : 'alt'}`}
                      onClick={onCtaClick}
                    >
                      {variant === 'A' ? 'Create Game' : 'Start Now'}
                    </button>
                    <button className="btn" onClick={() => track('secondary_clicked', { where: 'hero' })}>
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Leave Feedback</h3>
            <div className="grid">
              <div>
                <div className="label">Rating (1-5)</div>
                <select className="select" value={rating} onChange={e => setRating(e.target.value)}>
                  {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <div className="label">Comments</div>
                <input className="input" placeholder="What did you think?" value={text} onChange={e=>setText(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <button className="btn primary" onClick={onSendFeedback}>Send Feedback</button>
            </div>
          </div>
        </>
      ) : (
        <div className="card"><Dashboard /></div>
      )}
    </div>
  );
}

async function onCtaClick(e) {
  try { await clickWithPos('cta_clicked', e, { where: 'hero' }); }
  catch (err) { alert('CTA failed: ' + err.message); }
}

async function onAnyClick(e) {
  try { await clickWithPos('page_click', e, { where: 'demo_area' }); }
  catch (err) { console.error('page_click failed:', err); alert('Click failed: ' + err.message); }
}

async function onSendFeedback() {
  try {
    await submitFeedback({ rating: Number(rating), text });
    setText(''); alert('Thanks for the feedback!');
  } catch (err) {
    alert('Feedback failed: ' + err.message);
  }
}