import axios from 'axios';

const baseURL = process.env.VUE_APP_API_URL || 'http://127.0.0.1:3000/api/v1';

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
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/mfa')) {
        localStorage.removeItem('centaur_token');
        localStorage.removeItem('centaur_mfa_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
