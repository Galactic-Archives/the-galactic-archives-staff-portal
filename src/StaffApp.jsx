import React, { useState, useEffect } from 'react';
import StaffNavigation from './components/StaffNavigation';
import StaffDashboard from './components/StaffDashboard';
import TicketManagement from './components/TicketManagement';
import KnowledgeBaseEditor from './components/KnowledgeBaseEditor';
import AuthPage from './components/AuthPage';

export default function StaffApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authToken, setAuthToken] = useState(localStorage.getItem('staffAuthToken') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('staffUser') || 'null'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('staffRefreshToken') || null);

  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    let response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && refreshToken) {
      const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setAuthToken(data.access_token);
        localStorage.setItem('staffAuthToken', data.access_token);

        headers['Authorization'] = `Bearer ${data.access_token}`;
        response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        handleLogout();
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  };

  const handleAuthSuccess = (authData) => {
    setAuthToken(authData.accessToken);
    setRefreshToken(authData.refreshToken);
    setUser(authData.user);

    localStorage.setItem('staffAuthToken', authData.accessToken);
    localStorage.setItem('staffRefreshToken', authData.refreshToken);
    localStorage.setItem('staffUser', JSON.stringify(authData.user));
  };

  const handleLogout = () => {
    setAuthToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('staffAuthToken');
    localStorage.removeItem('staffRefreshToken');
    localStorage.removeItem('staffUser');
  };

  if (!authToken || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      <StaffNavigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        user={user}
        onLogout={handleLogout}
      />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-24)' }}>
        {currentPage === 'dashboard' && (
          <StaffDashboard apiFetch={apiFetch} />
        )}
        {currentPage === 'tickets' && (
          <TicketManagement apiFetch={apiFetch} />
        )}
        {currentPage === 'kb' && (
          <KnowledgeBaseEditor apiFetch={apiFetch} />
        )}
      </main>
    </div>
  );
}
