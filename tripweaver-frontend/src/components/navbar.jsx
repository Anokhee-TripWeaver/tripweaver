import React from "react";
import { useNavigate } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  // 🔹 Manual login
  const username = localStorage.getItem("username");

  // 🔹 Google login
  const googleUser = JSON.parse(localStorage.getItem("user"));

  // 🔹 Logged-in check (FIXED)
  const isLoggedIn = !!username || !!googleUser;

  // 🔹 Display name
  const displayName = googleUser?.name || username;

  // 🔹 Navigation handlers (NO BLOCKING)
  const goToSearch = () => navigate("/search");
  const goToPlanner = () => navigate("/planner");
  const goToTrips = () => navigate("/trips");
  const goToBookings = () => navigate("/bookings");

  const goToAuth = () => navigate("/signup");

  const logout = () => {
    localStorage.clear();
    navigate("/signup");
  };

  return (
    <nav className="navbar">
      <h1 className="logo" onClick={() => navigate("/")}>
        Trip<span>Weaver</span>
      </h1>

      <ul className="menu">
        <li onClick={goToSearch}>Destinations</li>
        <li onClick={goToPlanner}>Itinerary Planner</li>
        <li onClick={goToTrips}>Trips</li>
        <li onClick={goToBookings}>Bookings</li>

        {!isLoggedIn ? (
          <li onClick={goToAuth}>Login / Signup</li>
        ) : (
          <>
            <li onClick={() => navigate("/profile")}>
              👤 {displayName}
            </li>
            <li onClick={logout} style={{ color: "red" }}>
              Logout
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
