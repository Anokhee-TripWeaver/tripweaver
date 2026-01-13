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
  const [showPassword, setShowPassword] = useState(false); // password toggle

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
      await axios.post(`${API_BASE}/auth/signin`, formData, {
        headers: { "Content-Type": "application/json" }
      });

      sessionStorage.setItem("username", formData.username);
      // If the backend sends other details like email/role, store them too if needed
      // sessionStorage.setItem("email", ...); 
      // sessionStorage.setItem("role", ...);

      navigate("/");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Invalid username or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-card">
        <h2 className="signin-title">Welcome Back 👋</h2>
        <p className="signin-subtitle">Login to continue your journey</p>

        {error && <p className="error-box">{error}</p>}

        <form onSubmit={handleSubmit}>

          <div className="input-box" style={{ position: "relative", width: "100%", marginBottom: "20px" }}> 
            <i
              className="bx bxs-user"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.5rem",
                color: "#7b68ee"
              }}
            ></i>
            {/* Input field */}
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="off"
              style={{
                width: "100%",
                padding: "12px 15px 12px 40px", // left padding for icon, standard right padding
                fontSize: "1rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* PASSWORD */}
          <div className="input-box password-box" style={{ position: "relative", width: "100%", marginBottom: "20px" }}> {/* Added marginBottom for spacing */}
            {/* Lock icon */}
            <i
              className="bx bxs-lock-alt"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.5rem",
                color: "#7b68ee"
              }}
            ></i>
            {/* Input field */}
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "12px 40px 12px 40px", // space for both icons
                fontSize: "1rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box"
              }}
            />
            {/* Eye Icon */}
            <i
              className={`bx ${showPassword ? "bx-show" : "bx-hide"}`}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.5rem",
                color: "#7b68ee",
                cursor: "pointer"
              }}
            ></i>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div style={{ marginTop: "15px", textAlign: "center" }}>
            <p style={{ margin: "10px 0", color: "#666" }}>OR</p>
            <button
              type="button"
              className="google-btn"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                background: "#fff",
                color: "#333",
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "background 0.3s"
              }}
              onClick={() => alert("Google Login coming soon!")}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f5f5f5")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <i className='bx bxl-google' style={{ fontSize: "1.5rem", color: "#DB4437" }}></i>
              Continue with Google
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}