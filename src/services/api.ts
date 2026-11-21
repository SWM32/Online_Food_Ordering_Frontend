import axios, { AxiosError } from "axios";
import type { ErrorResponse } from "../types";

export const TOKEN_STORAGE_KEY = "jwt_token";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper to extract structured error details from backend ErrorResponse
export function parseApiError(error: unknown): {
  message: string;
  status?: number;
  validationErrors?: Record<string, string>;
} {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ErrorResponse>;
    const data = axiosErr.response?.data;

    if (data && typeof data === "object") {
      return {
        message: data.message || data.error || "An unexpected error occurred.",
        status: data.status ?? axiosErr.response?.status,
        validationErrors: data.validationErrors,
      };
    }

    if (axiosErr.code === "ERR_NETWORK") {
      return {
        message: `Unable to connect to the server (${API_BASE_URL}). Please make sure the backend is running.`,
      };
    }

    return {
      message: axiosErr.message || "Request failed.",
      status: axiosErr.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "An unexpected error occurred." };
}

export default api;
