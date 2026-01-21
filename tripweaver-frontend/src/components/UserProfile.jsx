import React, { useEffect, useState } from "react";
import axios from "axios";
import "./UserProfile.css";

axios.defaults.withCredentials = true;

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:8090/api/profile", { withCredentials: true })
      .then(res => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading profile...</p>;
  if (!profile) return <p>Please login</p>;

  return (
    <div className="profile-page">
      <div className="profile-container">

        <div className="profile-content">

          {/* LEFT → TRAVELLER PROFILE */}
          <div className="profile-card">
            <div className="avatar">
              <img
                src={profile.picture}
                alt="profile"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3>{profile.name}</h3>
            <p>{profile.email}</p>
            <span className="role-badge">Explorer</span>
          </div>

          {/* RIGHT → TRAVEL HISTORY */}
          <div className="history-section">
            <h3>Travel search History</h3>

            {profile.history.length === 0 ? (
              <p>No journeys yet</p>
            ) : (
              <div className="history-list">
                {profile.history.map((h, i) => (
                  <div key={i} className="history-item">
                    <div className="history-details">
                      <h4>{h.query}</h4>
                      <p>
                        {h.type === "DESTINATION" && "📍 Destination"}
                        {h.type === "TRIP" && "✈️ Trip"}
                        {h.type === "ITINERARY" && "🗺️ Itinerary"}
                        {" • "}
                        {h.category}
                      </p>
                      <small>
                        {new Date(h.searchedAt).toLocaleString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
