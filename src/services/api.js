import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "https://ai-receptionist-app-sy82.onrender.com";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const getMe = () => api.get("/auth/me");

export const getCalls = () => api.get("/calls");
export const getCall = (id) => api.get(`/calls/${id}`);

export const getAppointments = () => api.get("/dashboard/appointments");
export const createAppointment = (data) => api.post("/dashboard/appointments", data);
export const getAnalytics = (days = 30) => api.get(`/dashboard/analytics?days=${days}`);
export const getConfig = () => api.get("/dashboard/config");
export const updateConfig = (data) => api.put("/dashboard/config", data);

export default api;
