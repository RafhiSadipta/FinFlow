import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { getSavedToken } from '../utils/cookies';

// Smart base URL for web browser vs native mobile emulator / physical device
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('finflow_api_url');
    if (custom) return custom;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }
  return 'http://localhost:8080/api/v1';
};

const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT Token from cookie/localStorage if exists
apiClient.interceptors.request.use((config) => {
  const token = getSavedToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Endpoints
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    apiClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
};

// Wallet Endpoints
export const walletApi = {
  getAll: () => apiClient.get('/wallets'),
  getById: (id: string) => apiClient.get(`/wallets/${id}`),
  create: (data: any) => apiClient.post('/wallets', data),
  update: (id: string, data: any) => apiClient.put(`/wallets/${id}`, data),
  delete: (id: string) => apiClient.delete(`/wallets/${id}`),
};

// Category Endpoints
export const categoryApi = {
  getAll: () => apiClient.get('/categories'),
  getDeleted: () => apiClient.get('/categories/deleted'),
  getById: (id: string) => apiClient.get(`/categories/${id}`),
  create: (data: any) => apiClient.post('/categories', data),
  update: (id: string, data: any) => apiClient.put(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}`),
  restore: (id: string) => apiClient.post(`/categories/${id}/restore`),
};

// Transaction Endpoints
export const transactionApi = {
  getAll: (params?: { type?: string; category_id?: string; wallet_id?: string; start_date?: string; end_date?: string }) =>
    apiClient.get('/transactions', { params }),
  getById: (id: string) => apiClient.get(`/transactions/${id}`),
  create: (data: any) => apiClient.post('/transactions', data),
  update: (id: string, data: any) => apiClient.put(`/transactions/${id}`, data),
  delete: (id: string) => apiClient.delete(`/transactions/${id}`),
};

// Budget Endpoints
export const budgetApi = {
  getBudgets: (params?: { month?: number; year?: number }) =>
    apiClient.get('/budgets', { params }),
  setBudget: (data: { category_id: string; limit_amount: number; month: number; year: number }) =>
    apiClient.post('/budgets', data),
  delete: (id: string) => apiClient.delete(`/budgets/${id}`),
};

// Savings Goal Endpoints
export const savingsGoalApi = {
  getAll: () => apiClient.get('/savings-goals'),
  getById: (id: string) => apiClient.get(`/savings-goals/${id}`),
  create: (data: any) => apiClient.post('/savings-goals', data),
  update: (id: string, data: any) => apiClient.put(`/savings-goals/${id}`, data),
  deposit: (id: string, data: { amount: number; wallet_id?: string }) =>
    apiClient.post(`/savings-goals/${id}/deposit`, data),
  complete: (id: string, data: { actual_amount: number; wallet_id: string; category_id?: string; notes?: string }) =>
    apiClient.post(`/savings-goals/${id}/complete`, data),
  delete: (id: string) => apiClient.delete(`/savings-goals/${id}`),
};

// Analytics Endpoints
export const analyticsApi = {
  getDashboardSummary: () => apiClient.get('/analytics/dashboard'),
  getOverview: (params?: { month?: number; year?: number }) =>
    apiClient.get('/analytics/overview', { params }),
};
