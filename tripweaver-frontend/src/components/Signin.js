import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { User, Lock, LogIn } from "lucide-react";
import API_BASE from "../config";

export default function Signin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError("All fields are required!");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signin`, formData, {
        withCredentials: true
      });

      const backendUsername = res.data?.username || formData.username;
      const backendEmail = res.data?.email;

      localStorage.setItem("username", backendUsername);
      localStorage.removeItem("user");

      sessionStorage.setItem("username", backendUsername);
      if (backendEmail) {
        sessionStorage.setItem("email", backendEmail);
      }

      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // API_BASE is e.g. "http://localhost:8090/api"
    // We need "http://localhost:8090/oauth2/authorization/google"
    const oauthUrl = API_BASE.replace('/api', '') + '/oauth2/authorization/google';
    window.location.href = oauthUrl;
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
          Welcome Back! 👋
        </h2>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Sign in to continue your journey
        </p>
      </div>

      {error && (
        <div style={{
          background: 'linear-gradient(135deg, #fee, #fdd)',
          color: '#c62828',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          border: '1px solid #ffcdd2',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <User style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#667eea',
            width: '20px',
            height: '20px'
          }} />
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '14px 14px 14px 48px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s',
              background: '#f8f9fa'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.background = '#f8f9fa';
            }}
          />
        </div>

        <div style={{ position: 'relative', marginBottom: '25px' }}>
          <Lock style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#667eea',
            width: '20px',
            height: '20px'
          }} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '14px 14px 14px 48px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s',
              background: '#f8f9fa'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.background = '#f8f9fa';
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#9e9e9e' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
            marginBottom: '15px'
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
          }}
        >
          {loading ? 'Logging in...' : (
            <>
              <LogIn size={20} />
              Login
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
          <span style={{ color: '#999', fontSize: '0.85rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '12px',
            background: '#fff',
            color: '#333',
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#f8f9fa';
            e.target.style.borderColor = '#d0d0d0';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#fff';
            e.target.style.borderColor = '#e0e0e0';
          }}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            style={{ width: '18px', height: '18px' }}
          />
          Continue with Google
        </button>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
