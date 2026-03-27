import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHeart, FaShoppingCart } from "react-icons/fa";
import { Plane, User } from "lucide-react";
import axios from "axios";
import "./navbar.css";
import API_BASE from "../config";

axios.defaults.withCredentials = true;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);

  // 🔹 State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  // 🔹 Handle scroll for home page navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🔹 Check authentication from both sessionStorage and backend
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = sessionStorage.getItem("username");
      if (storedUser) {
        setIsLoggedIn(true);
        setUsername(storedUser);
      } else {
        try {
          // If no session storage, check with backend (for OAuth success)
          const res = await axios.get(`${API_BASE}/profile`);
          if (res.data && res.data.loggedIn) {
            setIsLoggedIn(true);
            setUsername(res.data.name);
            sessionStorage.setItem("username", res.data.name);
            sessionStorage.setItem("email", res.data.email);
          } else {
            setIsLoggedIn(false);
          }
        } catch (error) {
          setIsLoggedIn(false);
        }
      }
    };
    checkAuth();
  }, []);

  // 🔹 Navigation handlers
  const goToSignin = () => navigate("/signup");
  const goToSearch = () => (isLoggedIn ? navigate("/search") : navigate("/signup"));
  const goToPlanner = () => (isLoggedIn ? navigate("/planner") : navigate("/signup"));

  // 🔹 Logout
  const logout = async () => {
    try {
      // Clear frontend storage
      sessionStorage.clear();
      localStorage.clear();
      
      // Call backend logout
      await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
      
      // Update state
      setIsLoggedIn(false);
      setUsername("");
      
      // Redirect to signup page
      navigate("/signup");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if backend fails, clear frontend and redirect
      sessionStorage.clear();
      localStorage.clear();
      setIsLoggedIn(false);
      setUsername("");
      navigate("/signup");
    }
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      isHomePage 
        ? (isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm" : "bg-transparent") 
        : "bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className={`text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent`}>
            TripWeaver
          </span>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={goToSearch} 
            className={`font-medium transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
          >
            Destinations
          </button>
          <button 
            onClick={goToPlanner} 
            className={`font-medium transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
          >
            Itinerary Planner
          </button>
          <button 
            onClick={() => navigate("/trips")} 
            className={`font-medium transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
          >
            Trips
          </button>
          <button 
            onClick={() => navigate("/open-trips")} 
            className={`font-medium transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
          >
            Open Trips
          </button>
          <button 
            onClick={() => navigate("/bookings")} 
            className={`font-medium transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
          >
            Bookings
          </button>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <button 
                onClick={() => navigate("/wishlist")} 
                className={`transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
                title="Wishlist"
              >
                <FaHeart size={20} />
              </button>
              <button 
                onClick={() => navigate("/cart")} 
                className={`transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
                title="Cart"
              >
                <FaShoppingCart size={20} />
              </button>

              <div 
                onClick={() => navigate("/profile")}
                className={`flex items-center gap-2 cursor-pointer transition-all hover:scale-105 ${
                  isHomePage && !isScrolled ? "text-white" : "text-gray-700"
                }`}
                title="View Profile"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isHomePage && !isScrolled ? "border-white/30 bg-white/10" : "border-gray-200 bg-gray-50"
                }`}>
                  <User size={16} />
                </div>
                <span className="font-semibold hidden lg:inline">
                  Hello, {username}!
                </span>
              </div>

              <button 
                onClick={logout} 
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-bold transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={goToSignin} 
                className={`font-medium transition-colors ${isHomePage && !isScrolled ? "text-white hover:text-orange-300" : "text-gray-700 hover:text-orange-500"}`}
              >
                Login
              </button>
              <button 
                onClick={goToSignin} 
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
