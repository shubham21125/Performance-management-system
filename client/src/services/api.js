// Centralized API Service for Performance Management System
// Uses VITE_API_BASE_URL without hardcoding localhost

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002').replace(/\/$/, '');

// Login uses this project's own backend — same host/port as all other API calls
const AUTH_LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error parsing stored user:', err);
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    // Don't auto-redirect if this is already the login request failing
    if (!endpoint.includes('/api/auth/login')) {
      clearAuthSession();
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// API methods
export const api = {
  // Auth — uses this project's own backend login endpoint
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getCurrentUser: () => request('/api/auth/me'),

  // Reportees
  getReportees: () => request('/api/employees/reportees'),

  // Departments (Admin only)
  getDepartments: () => request('/api/departments'),

  // Reviews
  getReviews: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/api/reviews${qs ? `?${qs}` : ''}`);
  },

  getReviewStats: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/api/reviews/stats${qs ? `?${qs}` : ''}`);
  },

  getReviewById: (id) => request(`/api/reviews/${id}`),

  createReview: (reviewData) =>
    request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),

  updateReview: (id, reviewData) =>
    request(`/api/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    }),

  deleteReview: (id) =>
    request(`/api/reviews/${id}`, {
      method: 'DELETE',
    }),
};
