import React, { createContext, useState, useEffect, useContext } from 'react';
import { trackEvent, setUserProperties } from '../services/analytics';

const API_URL = 'https://quannv.id.vn';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      handleAuthCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthCallback = async (code) => {
    try {
      trackEvent('Authentication', 'OAuth Callback', 'Code Received');
      
      const response = await fetch(`${API_URL}/api/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        
        trackEvent('Authentication', 'Login Success', data.user.name);
        setUserProperties(data.user.id, {
          username: data.user.name
        });
      } else {
        console.error('Authentication failed');
        trackEvent('Authentication', 'Login Failed', 'Invalid Response');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      trackEvent('Authentication', 'Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      trackEvent('Authentication', 'Login Initiated', 'OAuth Button Click');
      
      const response = await fetch(`${API_URL}/api/auth/login-url`);
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
      trackEvent('Authentication', 'Login Error', error.message);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      trackEvent('Authentication', 'Logout', user?.name || 'Unknown');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
