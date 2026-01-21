import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/navbar";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import DestinationSearch from "./components/DestinationSearch";
import Explore from "./components/Explore";
import Trips from "./components/Trips";
import ItineraryPlanner from "./components/ItineraryPlanner";
import UserProfile from "./components/UserProfile";
import Wishlist from "./components/Wishlist";
import Cart from "./components/Cart";
import OAuthSuccess from "./components/OAuthSuccess";
import "./App.css";
import "boxicons/css/boxicons.min.css";

function Layout() {
  const [isSignup, setIsSignup] = useState(false);
  const location = useLocation();

  // ❌ Hide navbar on signup page
  const hideNavbar = location.pathname === "/signup";

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        {/* HOME */}
        <Route path="/" element={<Explore />} />

        {/* LOGIN / SIGNUP */}
        <Route
          path="/signup"
          element={
            <div className="auth-wrapper">
              <div className={`container ${isSignup ? "active" : ""}`}>
                <div className="form-box">
                  {isSignup ? <Signup /> : <Signin />}
                  <p className="toggle-text">
                    {isSignup ? (
                      <>
                        Already have an account?{" "}
                        <span onClick={() => setIsSignup(false)}>Login</span>
                      </>
                    ) : (
                      <>
                        Don’t have an account?{" "}
                        <span onClick={() => setIsSignup(true)}>Register</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="info-box">
                  {isSignup ? (
                    <>
                      <h2>Hello, Explorer!</h2>
                      <p>Start your journey by creating an account with us.</p>
                    </>
                  ) : (
                    <>
                      <h2>Welcome Back!</h2>
                      <p>To keep connected with us, please login using your credentials.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          }
        />

        {/* OTHER PAGES */}
        <Route path="/search" element={<DestinationSearch />} />
        <Route path="/planner" element={<ItineraryPlanner />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/signup" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
