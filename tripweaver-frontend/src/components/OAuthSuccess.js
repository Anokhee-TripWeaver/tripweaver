import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8090/api/auth/me", {
      credentials: "include"
    })
      .then(res => res.json())
      .then(user => {
        localStorage.setItem("user", JSON.stringify(user)); // google user
        localStorage.removeItem("username"); // clear manual login
        navigate("/search");

      });
  }, []);

  return <p>Logging in with Google...</p>;
}
