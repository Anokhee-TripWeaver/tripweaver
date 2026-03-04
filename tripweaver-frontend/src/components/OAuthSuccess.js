import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE from "../config";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

  useEffect(() => {
    const syncIdentity = async () => {
      try {
        const profileRes = await axios.get(`${API_BASE}/profile`, { withCredentials: true });
        const profileData = profileRes?.data || {};
        const name = resolveProfileName(profileData);
        const email = resolveProfileEmail(profileData);
        persistIdentity({ name, email });
      } catch {
        const fallbackEmail =
          sessionStorage.getItem("email") || localStorage.getItem("email") || "";
        const fallbackName =
          sessionStorage.getItem("username") || localStorage.getItem("username") || "";
        persistIdentity({
          name: fallbackName,
          email: isValidEmail(fallbackEmail) ? fallbackEmail : "",
        });
      } finally {
        navigate("/profile");
      }
    };

    syncIdentity();
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h3>Logging in with Google...</h3>
    </div>
  );
}
