/** Centralized client auth token keys — no secrets here */
export const AUTH_TOKEN_KEY = 'cegs_token';
export const AUTH_USER_KEY = 'cegs_user';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) return token;

  // Fallback: read from document.cookie if localStorage is empty
  try {
    const match = document.cookie.match(/(?:^|; )cegs_token=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {}
  return null;
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `cegs_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax${secureFlag}`;
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    document.cookie = 'cegs_token=; path=/; max-age=0; SameSite=Lax';
  }
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  document.cookie = 'cegs_token=; path=/; max-age=0; SameSite=Lax';
}

export const API_BASE = '/api';

/**
 * Fetch API only when a JWT exists — avoids 401 console spam.
 */
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
