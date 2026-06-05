import axios from "axios";
import { clearStoredSession, getStoredToken } from "../utils/authStorage.js";

const defaultApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
const api = axios.create({
  baseURL: defaultApiUrl,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getStoredToken()) {
      clearStoredSession();
      if (!window.location.pathname.includes("/login")) {
        window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
