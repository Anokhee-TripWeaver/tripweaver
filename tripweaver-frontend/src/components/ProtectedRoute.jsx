import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';

const ProtectedRoute = ({ children }) => {
  const [authState, setAuthState] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    // Check if this is an OAuth redirect with username/email in URL params
    const params = new URLSearchParams(location.search);
    const oauthUsername = params.get('username');
    const oauthEmail = params.get('email');

    if (params.get('oauth') === 'true' && oauthUsername) {
      sessionStorage.setItem('username', oauthUsername);
      localStorage.setItem('username', oauthUsername);
      if (oauthEmail) {
        sessionStorage.setItem('email', oauthEmail);
        localStorage.setItem('email', oauthEmail);
      }
      setAuthState('ok');
      return;
    }

    // Fast path: already have username in storage
    const stored = sessionStorage.getItem('username') || localStorage.getItem('username');
    if (stored) {
      setAuthState('ok');
      return;
    }

    // Slow path: check backend session
    axios
      .get(`${API_BASE}/profile`, { withCredentials: true })
      .then((res) => {
        if (res.data?.loggedIn) {
          sessionStorage.setItem('username', res.data.name);
          localStorage.setItem('username', res.data.name);
          if (res.data.email) {
            sessionStorage.setItem('email', res.data.email);
            localStorage.setItem('email', res.data.email);
          }
          setAuthState('ok');
        } else {
          setAuthState('denied');
        }
      })
      .catch(() => setAuthState('denied'));
  }, [location.search]);

  if (authState === 'checking') return null;
  if (authState === 'denied') return <Navigate to="/signup" replace />;
  return children;
};

export default ProtectedRoute;
