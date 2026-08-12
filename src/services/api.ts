import axios from 'axios';

const baseURL = process.env.VUE_APP_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('centaur_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const hash = window.location.hash || '';
      const publicAuth =
        hash.includes('/login') ||
        hash.includes('/mfa') ||
        hash.includes('/change-password') ||
        hash.includes('/forgot-password') ||
        hash.includes('/reset-password');
      if (!publicAuth) {
        localStorage.removeItem('centaur_token');
        localStorage.removeItem('centaur_mfa_token');
        localStorage.removeItem('centaur_temp_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
