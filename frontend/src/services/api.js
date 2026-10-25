import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const createBasicAuthHeader = (email, password) => ({
  Authorization: `Basic ${window.btoa(`${email}:${password}`)}`,
});

export const setAuthToken = (email, password) => {
  api.defaults.headers.common['Authorization'] = `Basic ${window.btoa(`${email}:${password}`)}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
};

export default api;

