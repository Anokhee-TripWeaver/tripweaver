import React, { useState, useRef } from "react";
import axios from "axios";
import Navbar from "./navbar";
import "./DestinationSearch.css";

export default function DestinationSearch() {
  const resultsRef = useRef(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("tourist_attraction");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalTitle, setModalTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const API_BASE = "http://localhost:8090/api";

  // Search destinations
  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Search query cannot be empty.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const url = `${API_BASE}/destination/search/google?query=${encodeURIComponent(
        query
      )}&category=${encodeURIComponent(category)}`;

      const res = await axios.get(url);

      const normalized = (res.data || []).map((d) => ({
        name: d.name || "Unknown Place",
        address: d.address || "",
        category: d.category || "",
        latitude: d.latitude,
        longitude: d.longitude,
        placeId: d.placeId, // ✅ include placeId for modal
        image:
          d.photoUrl ||
          `https://source.unsplash.com/800x400/?${encodeURIComponent(
            d.name || query
          )}&sig=${Date.now()}`,
      }));

      setResults(normalized);

      // Scroll to results
      if (resultsRef.current) {
        const navHeight = document.querySelector(".navbar")?.offsetHeight || 70;
        const topPos = resultsRef.current.offsetTop - navHeight - 10;
        window.scrollTo({ top: topPos, behavior: "smooth" });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch destinations.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // View more images
  const handleViewMore = async (destination) => {
    if (!destination.placeId) {
      alert("No Place ID available for this destination.");
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE}/destination/photos/${destination.placeId}`
      );
      if (!res.data || res.data.length === 0) {
        alert("No photos available for this destination.");
        return;
      }
      setModalImages(res.data);
      setModalTitle(destination.name);
      setModalOpen(true);
      setCurrentIndex(0); // Start from first image
    } catch (err) {
      console.error(err);
      alert("Failed to fetch more images.");
    }
  };

  return (
    <div className="explore-container">
      <Navbar />
      <div style={{ height: "70px" }}></div>

      <div className="main-content">
        <h2>Destination Finder</h2>

        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
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

          <button className="search-btn" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="error-message">⚠️ {error}</p>}

        <div className="results-container" ref={resultsRef}>
          {results.map((d, i) => (
            <div key={i} className="dest-card">
              <img
                src={d.image}
                alt={d.name}
                className="dest-photo"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.onerror = null;
                  e.src =
                    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800";
                }}
              />
              <h3>{d.name}</h3>
              <p className="address">{d.address || "Address not available"}</p>
              <div className="details-row">
                <span>
                  <strong>Category:</strong>{" "}
                  <span className="category-value">{d.category || "N/A"}</span>
                </span>
                <span>
                  <strong>Coordinates:</strong>{" "}
                  <span className="coords-value">
                    {d.latitude && d.longitude
                      ? `${d.latitude}, ${d.longitude}`
                      : "N/A"}
                  </span>
                </span>
              </div>
              <button
                className="view-more-btn"
                onClick={() => handleViewMore(d)}
              >
                View More Images
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{modalTitle}</h2>

            {modalImages.length > 0 && (
              <div className="modal-image-viewer">
                <button
                  className="nav-btn left"
                  onClick={() =>
                    setCurrentIndex(
                      (currentIndex - 1 + modalImages.length) % modalImages.length
                    )
                  }
                >
                  ◀
                </button>

                <img
                  src={modalImages[currentIndex]}
                  alt={`img-${currentIndex}`}
                  className="modal-main-img"
                />

                <button
                  className="nav-btn right"
                  onClick={() =>
                    setCurrentIndex((currentIndex + 1) % modalImages.length)
                  }
                >
                  ▶
                </button>
              </div>
            )}

            <div className="modal-thumbnails">
              {modalImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`thumb-${idx}`}
                  className={`thumbnail ${idx === currentIndex ? "active" : ""}`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>

            <button className="close-btn" onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
