const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || `http://${defaultHost}:8000/api`;
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'asrf-session-token';
const AUTH_ROLE_KEY = 'asrf-session-role';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const { skipAuth = false, timeout = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (!skipAuth) {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: options.credentials || 'include',
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/')) {
        window.dispatchEvent(new Event('auth-expired'));
      }
      throw new ApiError(payload?.message || `Request failed (${response.status})`, response.status, payload);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The backend request timed out. Check that the API is running.', 408);
    if (error instanceof ApiError) throw error;
    throw new ApiError('The backend is unavailable. Start the FastAPI service and retry.', 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  baseUrl: API_BASE_URL,
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  getBlob: async (path, options = {}) => {
    const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new ApiError(`Failed to fetch blob (${response.status})`, response.status);
    return await response.blob();
  },
};

export const authStorage = {
  getToken: () => sessionStorage.getItem(AUTH_TOKEN_KEY),
  setToken: (token) => sessionStorage.setItem(AUTH_TOKEN_KEY, token),
  getRole: () => sessionStorage.getItem(AUTH_ROLE_KEY),
  setRole: (role) => sessionStorage.setItem(AUTH_ROLE_KEY, role),
  clear: () => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_ROLE_KEY);
  },
};

export function toPageQuery({ page = 0, size = 25, ...filters } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return params.toString();
}
