import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // standard headers
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Don't retry auth routes to prevent infinite loops
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/signup')) {
        return Promise.reject(error);
    }
    
    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = sessionStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Attempt to refresh token
          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (refreshRes.data?.access_token) {
            // Save new tokens
            sessionStorage.setItem('access_token', refreshRes.data.access_token);
            if (refreshRes.data.refresh_token) {
               sessionStorage.setItem('refresh_token', refreshRes.data.refresh_token);
            }
            
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${refreshRes.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          // Clear auth on refresh failure
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('userEmail');
          sessionStorage.removeItem('user');
          // Optional: trigger user logout flow or redirect to login
          window.location.href = '/login';
        }
      } else {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const applicationAPI = {
  getAll: () => api.get('/applications'),
  getById: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  update: (id, data) => api.put(`/applications/${id}`, data),
  cancel: (id, data = { cancellation_reason: 'Cancelled by user' }) => api.patch(`/applications/${id}/cancel`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  uploadDocument: (id, formData) => 
    api.post(`/applications/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const countryAPI = {
  getAll: () => api.get('/countries'),
  getById: (code) => api.get(`/countries/${code}`),
  getVisaTypes: (code) => api.get(`/countries/${code}/visa-types`),
};

export const profileAPI = {
  getMyProfile: () => api.get('/auth/profile'),
  updateMyProfile: (data) => api.put('/auth/profile', data),
};

export const chatAPI = {
  sendMessage: (message) => api.post('/chat', { message }),
  getHistory: () => api.get('/chat/history'),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getApplications: (params = {}) => api.get('/admin/applications', { params }),
  flushApplications: () => api.delete('/admin/applications/flush'),
  getApplicationById: (id) => api.get(`/admin/applications/${id}`),
  updateApplicationStatus: (id, data) => api.put(`/admin/applications/${id}/status`, data),
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

export const operationsAPI = {
  getProcessingApplications: (params = {}) => api.get('/operations/applications/processing', { params }),
  moveAllToUnderReview: (data = {}) => api.post('/operations/applications/processing/move-all-under-review', data),
  moveToUnderReview: (id, data = {}) => api.put(`/operations/applications/${id}/move-under-review`, data),
  getUnderReviewApplications: (params = {}) => api.get('/operations/applications/under-review', { params }),
  getFinalizedApplications: (params = {}) => api.get('/operations/applications/finalized', { params }),
  getApplicationById: (id) => api.get(`/operations/applications/${id}`),
  finalizeApplication: (id, data) => api.put(`/operations/applications/${id}/finalize`, data),
  getDocumentBlob: (applicationId, docIndex) =>
    api.get(`/operations/applications/${applicationId}/documents/${docIndex}`, {
      responseType: 'blob',
    }),
};

export const financeAPI = {
  // Dashboard overview
  getDashboardOverview: () => api.get('/finance/dashboard/overview'),
  
  // Application status queries
  getReviewedApplications: (params = {}) => api.get('/finance/applications/reviewed', { params }),
  getFeeUnpaidApplications: (params = {}) => api.get('/finance/applications/fee-unpaid', { params }),
  getFeeVerificationApplications: (params = {}) => api.get('/finance/applications/fee-verification', { params }),
  getFeeVerifiedApplications: (params = {}) => api.get('/finance/applications/fee-verified', { params }),
  
  // Invoice management
  generateInvoice: (data) => api.post('/finance/invoices/generate', data),
  sendInvoice: (applicationId) => api.post(`/finance/invoices/send?application_id=${applicationId}`),
  bulkGenerateAndSendInvoices: (data) => api.post('/finance/invoices/bulk-generate-and-send', data),
  
  // Payment verification
  approvePaymentVerification: (data) => api.post('/finance/payment-verification/approve', data),
  rejectPaymentVerification: (data) => api.post('/finance/payment-verification/reject', data),
  getPaymentProofFile: (applicationId) =>
    api.get(`/finance/applications/${applicationId}/payment-proof`, {
      responseType: 'blob',
    }),
  
  // General reports
  getAllApplications: (params = {}) => api.get('/finance/applications/all', { params }),
  getApplicationsByStatus: () => api.get('/finance/applications/by-status'),
  getApplicationsByCountry: () => api.get('/finance/applications/by-country'),
};

export const applicationAPI_extended = {
  uploadPaymentProof: (applicationId, formData) =>
    api.post(`/applications/${applicationId}/upload-payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadInvoicePdf: (applicationId) =>
    api.get(`/applications/${applicationId}/invoice-pdf`, {
      responseType: 'blob',
    }),
};

export default api;
