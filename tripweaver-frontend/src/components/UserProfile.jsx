import React, { useState, useEffect } from "react";
import Navbar from "./navbar";
import axios from "axios";
import "./UserProfile.css";

export default function UserProfile() {

  const googleUser = JSON.parse(localStorage.getItem("user"));
  const username = localStorage.getItem("username");

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {

    // ✅ GOOGLE USER
    if (googleUser) {
      setUser({
        username: googleUser.name,
        email: googleUser.email,
        role: "Explorer",
        picture: googleUser.picture
      });
      return;
    }

    // ✅ MANUAL USER
    if (username) {
      axios.get(`http://localhost:8090/api/user/${username}`)
        .then(res => setUser(res.data))
        .catch(err => console.error(err));

      axios.get(`http://localhost:8090/api/user/${username}/history`)
        .then(res => setHistory(res.data))
        .catch(err => console.error(err));
    }

  }, [username, googleUser]);

  if (!user) {
    return <div>Please login</div>;
  }

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-container">

        <div className="profile-card">
          <div className="avatar">
            {user.picture ? (
              <img src={user.picture} alt="profile" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>

          <h3>{user.username}</h3>
          <p>{user.email}</p>
          <span className="role-badge">{user.role}</span>

          {googleUser && (
            <p className="info-text">
              Profile details are managed by Google
            </p>
          )}
        </div>

        {!googleUser && (
          <div className="history-section">
            <h3>Past Searches</h3>
            {history.length === 0 ? (
              <p>No history found</p>
            ) : (
              history.map(item => (
                <div key={item.id}>
                  {item.origin} ➝ {item.destination}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
