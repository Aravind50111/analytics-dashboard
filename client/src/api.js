export const API_BASE = 'http://localhost:4000';

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} – ${text}`.slice(0, 400));
  }
  return res.json();
}

export async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return handle(res);
}