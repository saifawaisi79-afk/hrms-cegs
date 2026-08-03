/** Centralized client auth token keys — no secrets here */
export const AUTH_TOKEN_KEY = 'cegs_token';
export const AUTH_USER_KEY = 'cegs_user';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export const API_BASE = '/api';

/**
 * Ensure a JWT exists for API writes (candidates POST, etc.).
 * If missing, attempts seed/API login for the given email.
 */
export async function ensureAuthToken(email, password = 'Password123') {
  if (typeof window === 'undefined') return null;
  const existing = getAuthToken();
  if (existing) return existing;
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      setAuthToken(data.token);
      return data.token;
    }
  } catch (err) {
    console.warn('ensureAuthToken failed:', err);
  }
  return null;
}

/** Fetch API only when a JWT exists — avoids 401 console spam. */
export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, status: 401, skipped: true, json: async () => ({ error: 'No auth token' }) };
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(path.startsWith('/') ? path : `${API_BASE}/${path}`, { ...options, headers });
}
