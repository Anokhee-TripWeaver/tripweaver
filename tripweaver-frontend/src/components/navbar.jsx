import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaShoppingCart } from "react-icons/fa";
import "./navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  // Retrieve user data from sessionStorage (Session-based auth)
  const username = sessionStorage.getItem("username");
  const email = sessionStorage.getItem("email");
  const role = sessionStorage.getItem("role");
  const isLoggedIn = !!username;

  // Navigation handlers
  const goToSignin = () => navigate("/signup"); 
  const goToSearch = () => (isLoggedIn ? navigate("/search") : navigate("/signup"));
  const goToPlanner = () => (isLoggedIn ? navigate("/planner") : navigate("/signup"));
  
  const logout = () => {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("role");
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
        <li onClick={() => navigate("/trips")}>Trips</li>
        <li onClick={goToSearch}>Bookings</li>

        {isLoggedIn && (
          <>
            <li onClick={() => navigate("/wishlist")} title="Wishlist" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
              <FaHeart />
            </li>
            <li onClick={() => navigate("/cart")} title="Cart" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
              <FaShoppingCart />
            </li>
          </>
        )}

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