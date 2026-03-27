import React, { useState } from "react";
import axios from "axios";
import { User, Mail, Lock, UserPlus, CheckCircle } from "lucide-react";
import API_BASE from "../config";

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER"
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    const { username, email, password } = formData;

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long!");
      return false;
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      setError("Enter a valid email address!");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long!");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true
      });

      setSuccess(res.data?.message || "Registration Successful! 🎉");
      setFormData({ username: "", email: "", password: "", role: "USER" });
      setError("");
    } catch (err) {
      const msg = err.response?.data?.message || "Signup failed! Server error.";
      setError(msg);
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const oauthUrl = API_BASE.replace('/api', '') + '/oauth2/authorization/google';
    window.location.href = oauthUrl;
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
          Create Account ✨
        </h2>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Join us and start your adventure
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

      {success && (
        <div style={{
          background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
          color: '#2e7d32',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          border: '1px solid #a5d6a7',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={18} />
          <span>{success}</span>
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
            required
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

        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Mail style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#667eea',
            width: '20px',
            height: '20px'
          }} />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
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
            required
            autoComplete="new-password"
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
          {loading ? 'Creating account...' : (
            <>
              <UserPlus size={20} />
              Register
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

export default Signup;
