import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('ff_user');
  if (stored) {
    const { token } = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ff_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
