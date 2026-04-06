import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/navbar";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import DestinationSearch from "./components/DestinationSearch";
import Explore from "./components/Explore";
import LandingPage from "./components/LandingPage";
import Trips from "./components/Trips";
import ItineraryPlanner from "./components/ItineraryPlanner";
import UserProfile from "./components/UserProfile";
import OpenTrips from "./components/OpenTrips";
import Wishlist from "./components/Wishlist";
import Cart from "./components/Cart";
import PaymentPage from "./components/PaymentPage";
import Bookings from "./components/Bookings";
import Chatbot from "./components/Chatbot";
import AboutUs from "./components/AboutUs";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";
import "boxicons/css/boxicons.min.css";

function Layout() {
  const [isSignup, setIsSignup] = useState(false);
  const [chatContext, setChatContext] = useState({});
  const location = useLocation();

  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  }, []);

  const hideNavbar = location.pathname === "/signup";
  const hideChatbot = location.pathname === "/signup" || location.pathname === "/signin" || location.pathname === "/";

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<Explore />} />

        <Route
          path="/signup"
          element={
            <div className="auth-wrapper">
              <div className={`container ${isSignup ? "active" : ""}`}>
                <div className="form-box">
                  {isSignup ? <Signup /> : <Signin />}
                  <p className="toggle-text">
                    {isSignup ? (
                      <>Already have an account? <span onClick={() => setIsSignup(false)}>Login</span></>
                    ) : (
                      <>Don't have an account? <span onClick={() => setIsSignup(true)}>Register</span></>
                    )}
                  </p>
                </div>
                <div className="info-box">
                  {isSignup ? (
                    <><h2>Hello, Explorer!</h2><p>Start your journey by creating an account with us.</p></>
                  ) : (
                    <><h2>Welcome Back!</h2><p>To keep connected with us, please login using your credentials.</p></>
                  )}
                </div>
              </div>
            </div>
          }
        />

        <Route path="/search" element={<ProtectedRoute><DestinationSearch /></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><ItineraryPlanner /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/open-trips" element={<ProtectedRoute><OpenTrips onTripsLoaded={(trips) => setChatContext({ trips })} /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {!hideChatbot && <Chatbot user={user} pageContext={chatContext} />}
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin routes - completely separate, no main navbar */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
        {/* Main app */}
        <Route path="/*" element={<Layout />} />
      </Routes>
    </Router>
  );
}

export default App;
