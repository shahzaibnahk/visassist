import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        // Fetch fresh profile from backend
        const response = await api.get('/auth/me');
        setUser(response.data);
        sessionStorage.setItem('user', JSON.stringify(response.data));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('user');
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = response.data;
      
      // Store tokens
      if (access_token) sessionStorage.setItem('access_token', access_token);
      if (refresh_token) sessionStorage.setItem('refresh_token', refresh_token);
      sessionStorage.setItem('userEmail', user.email);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      
      return { 
        success: true,
        role: user.role,
        userType: user.user_type,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await api.post('/auth/signup', userData);
      const { user, access_token, refresh_token } = response.data;
      
      // Store tokens
      if (access_token) sessionStorage.setItem('access_token', access_token);
      if (refresh_token) sessionStorage.setItem('refresh_token', refresh_token);
      sessionStorage.setItem('userEmail', user.email);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Signup failed',
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser: fetchCurrentUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
