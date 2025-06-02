import axiosInstance from '../utils/axiosInstance';
import { API_URLS } from '../config/api';
import { encryptData } from '../utils/encryption';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role?: 'admin' | 'recruiter' | 'hiring_manager';
  };
  token: string;
}

/**
 * Login a user with email and password
 * Encrypts sensitive credentials before sending to the server
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  // Encrypt the credentials
  const encryptedData = encryptData(credentials);
  
  // Send only the encrypted data
  const response = await axiosInstance.post(`${API_URLS.AUTH}/login`, { encryptedData });
  return response.data;
};

/**
 * Register a new user
 * Encrypts sensitive user data before sending to the server
 */
export const registerUser = async (userData: RegisterData): Promise<AuthResponse> => {
  // Encrypt the user data
  const encryptedData = encryptData(userData);
  
  // Send only the encrypted data
  const response = await axiosInstance.post(`${API_URLS.AUTH}/register`, { encryptedData });
  return response.data;
};

/**
 * Logout the current user
 */
export const logoutUser = async (): Promise<void> => {
  await axiosInstance.post(`${API_URLS.AUTH}/logout`);
  // Clear token from localStorage
  localStorage.removeItem('token');
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthResponse['user'] | null> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }
  
  try {
    const response = await axiosInstance.get(`${API_URLS.AUTH}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.user;
  } catch (error) {
    // If token is invalid or expired
    localStorage.removeItem('token');
    return null;
  }
};