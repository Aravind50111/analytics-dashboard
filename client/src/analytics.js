import { postJSON } from './api';

function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const state = {
  sessionId: null,
  variant: 'A',
  containerEl: null,
};

export function initAnalytics({ containerSelector = '#demo-area' } = {}) {
  // session & variant
  let sid = localStorage.getItem('sessionId');
  if (!sid) { sid = uuid(); localStorage.setItem('sessionId', sid); }
  state.sessionId = sid;

  let v = localStorage.getItem('abVariant');
  if (!v) { v = Math.random() < 0.5 ? 'A' : 'B'; localStorage.setItem('abVariant', v); }
  state.variant = v;

  // Tell backend the session started
  track('session_started');

  // Save container for relative click coords
  state.containerEl = document.querySelector(containerSelector);
}

export function getVariant() {
  return state.variant;
}

export async function track(name, meta = {}) {
  return postJSON('/api/event', {
    sessionId: state.sessionId,
    variant: state.variant,
    name,
    meta,
  });
}

export async function clickWithPos(name, evt, meta = {}) {
  if (!state.containerEl) return track(name, meta);

  const rect = state.containerEl.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / rect.width;
  const y = (evt.clientY - rect.top) / rect.height;

  return postJSON('/api/event', {
    sessionId: state.sessionId,
    variant: state.variant,
    name,
    meta,
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  });
}

export async function submitFeedback({ rating, text }) {
  return postJSON('/api/feedback', {
    sessionId: state.sessionId,
    rating,
    text,
  });
}