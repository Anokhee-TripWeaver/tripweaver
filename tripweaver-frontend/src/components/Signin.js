import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Signin() {
  const navigate = useNavigate();
  const API_BASE = "http://localhost:8090/api";

  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  // ✅ MANUAL LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError("All fields are required!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/signin`, formData);
      localStorage.setItem("username", formData.username);
      localStorage.removeItem("user"); // clear google user if any
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // ✅ GOOGLE LOGIN
  const googleLogin = () => {
    window.location.href =
      "http://localhost:8090/oauth2/authorization/google";
  };

  return (
    <div className="signin-page">
      <div className="signin-card">
        <h2>Welcome Back 👋</h2>

        {error && <p className="error-box">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />

          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <hr />
          <button className="google-btn" onClick={googleLogin}>
      <img
        src="https://developers.google.com/identity/images/g-logo.png"
        alt="Google"
      />
      Continue with Google
    </button>

      </div>
    </div>
  );
}
