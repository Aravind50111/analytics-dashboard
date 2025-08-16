export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}