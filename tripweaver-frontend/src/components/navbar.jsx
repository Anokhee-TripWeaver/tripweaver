import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaShoppingCart } from "react-icons/fa";
import axios from "axios";
import "./navbar.css";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";

axios.defaults.withCredentials = true;

export default function Navbar() {
  const navigate = useNavigate();

  // 🔹 State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  // 🔹 Check backend session (OAuth / normal login)
  useEffect(() => {
    axios
      .get("http://localhost:8090/api/profile/status", {
        withCredentials: true
      })
      .then(res => {
        if (res.data.loggedIn) {
          const resolvedName = resolveProfileName(res.data) || res.data.name;
          const resolvedEmail = resolveProfileEmail(res.data);
          setIsLoggedIn(true);
          setUsername(resolvedName || "");

          persistIdentity({ name: resolvedName, email: resolvedEmail });
        } else {
          fallbackSessionCheck();
        }
      })
      .catch(() => fallbackSessionCheck());
  }, []);

  // 🔹 Fallback: sessionStorage login
  const fallbackSessionCheck = () => {
    const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
    if (storedUser) {
      setIsLoggedIn(true);
      setUsername(storedUser);
    } else {
      setIsLoggedIn(false);
    }
  };

  // 🔹 Navigation handlers
  const goToSignin = () => navigate("/signup");
  const goToSearch = () => (isLoggedIn ? navigate("/search") : navigate("/signup"));
  const goToPlanner = () => (isLoggedIn ? navigate("/planner") : navigate("/signup"));

  // 🔹 Logout (backend + frontend cleanup)
  const logout = () => {
    sessionStorage.clear();
    window.location.href = "http://localhost:8090/logout";
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <h1 className="logo" onClick={() => navigate("/")}>
        Trip<span>Weaver</span>
      </h1>

      {/* Menu */}
      <ul className="menu">
        <li onClick={goToSearch}>Destinations</li>
        <li onClick={goToPlanner}>Itinerary Planner</li>
        <li onClick={() => navigate("/trips")}>Trips</li>
        <li onClick={() => navigate("/open-trips")}>Open Trips</li>
        <li onClick={() => navigate("/bookings")}>Bookings</li>

        {/* Icons (only if logged in) */}
        {isLoggedIn && (
          <>
            <li onClick={() => navigate("/wishlist")} title="Wishlist">
              <FaHeart />
            </li>
            <li onClick={() => navigate("/cart")} title="Cart">
              <FaShoppingCart />
            </li>
          </>
        )}

        {/* Auth Section */}
        {!isLoggedIn ? (
          <li onClick={goToSignin}>Login / Signup</li>
        ) : (
          <>
            <li onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
              👤 {username}
            </li>
            <li onClick={logout} style={{ color: "red", cursor: "pointer" }}>
              Logout
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
