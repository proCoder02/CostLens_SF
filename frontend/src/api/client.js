import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request interceptor: attach JWT ────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('costlens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ───────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('costlens_token');
      localStorage.removeItem('costlens_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
