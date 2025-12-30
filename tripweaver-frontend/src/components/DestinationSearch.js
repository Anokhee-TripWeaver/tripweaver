import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Navbar from "./navbar";
import "./DestinationSearch.css";

const API_BASE = "http://localhost:8090/api";

export default function DestinationSearch() {
  const resultsRef = useRef(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("tourist_attraction");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState({ open: false, images: [], title: "", index: 0 });

  // Handle Body Scroll Lock
  useEffect(() => {
    document.body.style.overflow = modal.open ? "hidden" : "unset";
  }, [modal.open]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return setError("Please enter a destination name.");

    setError("");
    setLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/destination/search/google`, {
        params: { query, category }
      });

      const data = res.data || [];
      if (data.length === 0) setError("No destinations found for this search.");

      const normalized = data.map((d) => ({
        ...d,
        name: d.name || "Unknown Place",
        image: d.photoUrl || `https://source.unsplash.com/800x400/?${encodeURIComponent(d.name || query)}`,
      }));

      setResults(normalized);
      if (resultsRef.current) {
        setTimeout(() => resultsRef.current.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err) {
      setError("Failed to fetch destinations. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMore = async (destination) => {
    if (!destination.placeId) return setError("No detailed info available for this spot.");

    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/destination/photos/${destination.placeId}`);
      if (!res.data || res.data.length === 0) {
        setError("No additional photos found.");
      } else {
        setModal({ open: true, images: res.data, title: destination.name, index: 0 });
      }
    } catch (err) {
      setError("Failed to load images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="explore-container">
      <Navbar />

      <div className="main-content">
        <div className="hero-text">
          <h2>Destination Finder</h2>
          <p>Discover your next favorite place</p>
        </div>

        <form className="search-box" onSubmit={handleSearch}>
          <div className="search-inputs">
            <input
              type="text"
              placeholder="Search a city, country, or landmark"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="search-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="tourist_attraction">Tourist Spots</option>
              <option value="accommodation">Hotels & Stays</option>
              <option value="restaurant">Restaurants & Food</option>
            </select>
          </div>
          <button className="search-btn" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <div className="error-banner">⚠️ {error}</div>}

        <div className="results-container" ref={resultsRef}>
          {results.map((d, i) => (
            <div key={d.placeId || i} className="dest-card">
              <div className="card-img-wrapper">
                <img
                  src={d.image}
                  alt={d.name}
                  className="dest-photo"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800";
                  }}
                />
              </div>
              <div className="card-info">
                <h3>{d.name}</h3>
                <p className="address">{d.address || "Address not available"}</p>
                <div className="details-row">
                  <span className="badge">{d.category?.replace("_", " ")}</span>
                  <span className="coords">📍 {d.latitude?.toFixed(2)}, {d.longitude?.toFixed(2)}</span>
                </div>
                <button className="view-more-btn" onClick={() => handleViewMore(d)}>
                  View Gallery
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="modal-overlay" onClick={() => setModal({ ...modal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-x" onClick={() => setModal({ ...modal, open: false })}>×</button>
            <h2>{modal.title}</h2>

            <div className="modal-image-viewer">
              <button
                className="nav-btn left"
                onClick={() => setModal({ ...modal, index: (modal.index - 1 + modal.images.length) % modal.images.length })}
              >
                ◀
              </button>
              <img src={modal.images[modal.index]} alt="Location" className="modal-main-img" />
              <button
                className="nav-btn right"
                onClick={() => setModal({ ...modal, index: (modal.index + 1) % modal.images.length })}
              >
                ▶
              </button>
            </div>

            <div className="modal-thumbnails">
              {modal.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="thumbnail"
                  className={`thumbnail ${idx === modal.index ? "active" : ""}`}
                  onClick={() => setModal({ ...modal, index: idx })}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}