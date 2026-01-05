import React, { useState } from "react";
import axios from "axios";
import "boxicons/css/boxicons.min.css";


function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER"   // ✅ default role
  });
  const API_BASE = "http://localhost:8090/api"; // just the backend base URL


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
        headers: { "Content-Type": "application/json" }
      });

      setSuccess(res.data?.message || "Registration Successful!");
      setFormData({ username: "", email: "", password: "", role: "USER" });
      setError("");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Signup failed! Server error.";
      setError(msg);
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <form onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          {error && <p className="error-box" role="alert">{error}</p>}
          {success && <p className="success-box">{success}</p>}

          <div className="input-box">
            <i className="bx bxs-user"></i>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-box">
            <i className="bx bxs-envelope"></i>
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-box">
            <i className="bx bxs-lock-alt"></i>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Signup;