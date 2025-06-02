/**
 * Centralized API configuration
 */

// Base API URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Endpoint-specific URLs
export const API_URLS = {
  AUTH: `${API_BASE_URL}/auth`,
  JOBS: `${API_BASE_URL}/jobs`,
  APPLICANTS: `${API_BASE_URL}/applicants`,
  RESUMES: `${API_BASE_URL}/resumes`,
  INTERVIEWS: `${API_BASE_URL}/interviews`,
  CHATS: `${API_BASE_URL}/chats`,
  BIAS: `${API_BASE_URL}/bias`,
};