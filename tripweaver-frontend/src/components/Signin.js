import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";
import API_BASE from "../config";

export default function Signin() {
  const navigate = useNavigate();
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

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
      await axios.post(`${API_BASE}/auth/signin`, formData, { withCredentials: true });
      try {
        const profileRes = await axios.get(`${API_BASE}/profile`, { withCredentials: true });
        const profileName = resolveProfileName(profileRes.data) || formData.username;
        const profileEmail = resolveProfileEmail(profileRes.data) || (isValidEmail(formData.username) ? formData.username : "");
        persistIdentity({ name: profileName, email: profileEmail });
      } catch {
        persistIdentity({
          name: formData.username,
          email: isValidEmail(formData.username) ? formData.username : "",
        });
      }
      localStorage.setItem("username", formData.username);
      localStorage.removeItem("user");
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    window.location.href =
      "http://localhost:8090/oauth2/authorization/google";
  };

  return (
    <>
      <h2>Welcome Back 👋</h2>

      {error && <p className="error-box">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="input-box">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />
        </div>

        <div className="input-box">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <hr style={{ margin: "20px 0" }} />
       {/* 🔹 Divider */}
        <p style={{ margin: "15px 0", color: "#666", textAlign: "center" }}>
          OR
        </p>
      <button className="google-btn" onClick={googleLogin}>
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google"
        />
        Continue with Google
      </button>
    </>
  );
}
