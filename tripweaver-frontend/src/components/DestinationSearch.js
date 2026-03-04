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
  const quickPrompts = [
    "Hyderabad tourist attractions",
    "Best hotels in Paris",
    "Top restaurants in Bangkok",
    "Family-friendly places in Manali",
    "Romantic spots in Singapore",
  ];

  const API_BASE = "http://localhost:8090/api";

  const buildFallbackImages = (seedText) => {
    const seed = encodeURIComponent(seedText || query || "travel destination");
    return [
      `https://source.unsplash.com/1400x900/?${seed}&sig=11`,
      `https://source.unsplash.com/1400x900/?${seed}&sig=12`,
      `https://source.unsplash.com/1400x900/?${seed}&sig=13`,
      `https://source.unsplash.com/1400x900/?${seed}&sig=14`,
    ];
  };

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
    const fallback = buildFallbackImages(destination?.name || query);
    if (!destination.placeId) {
      setModalImages(fallback);
      setModalTitle(destination?.name || "Destination");
      setModalOpen(true);
      setCurrentIndex(0);
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE}/destination/photos/${destination.placeId}`
      );
      const list = Array.isArray(res?.data) && res.data.length > 0 ? res.data : fallback;
      setModalImages(list);
      setModalTitle(destination.name);
      setModalOpen(true);
      setCurrentIndex(0); // Start from first image
    } catch (err) {
      console.error(err);
      setModalImages(fallback);
      setModalTitle(destination?.name || "Destination");
      setModalOpen(true);
      setCurrentIndex(0);
    }
  };

  const buildMapsUrl = (destination) => {
    if (!destination) return null;
    const queryText = `${destination.name || ""} ${destination.address || ""}`.trim();
    if (!queryText) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
  };

  return (
    <div className="explore-container">
      <Navbar />
      <div style={{ height: "70px" }}></div>

      <div className="main-content">
        <div className="destination-hero">
          <div className="hero-nav-row">
            <span className="hero-brand">TripWeaver</span>
            <div className="hero-nav-links">
              <span>Discover</span>
              <span>Journeys</span>
              <span>Stays</span>
              <span>Gallery</span>
              <span>Contact</span>
            </div>
          </div>

          <div className="hero-copy">
            <h2>Destination Finder</h2>
            <p className="destination-subtitle">
              Discover places, compare stays, and explore photos before you book your next trip.
            </p>
          </div>

          <div className="search-panel">
            <form
              className="search-box"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <input
                type="text"
                placeholder="I want to find a quiet place in Italy for a wellness retreat..."
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
            <div className="prompt-chips">
              {quickPrompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="prompt-chip"
                  onClick={() => setQuery(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="error-message">⚠️ {error}</p>}

        <div className="results-container" ref={resultsRef}>
          {results.length > 0 && (
            <div className="results-toolbar">
              <span className="results-count">{results.length} result(s)</span>
              <span className="results-query">
                Showing {category.replace("_", " ")} for "{query}"
              </span>
            </div>
          )}
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
              <div className="dest-overlay">
                <div className="dest-top">
                  <h3>{d.name}</h3>
                </div>
                <p className="address">{d.address || "Address not available"}</p>
                <div className="details-row">
                  <span className="category-value">{d.category || "N/A"}</span>
                  <span className="coords-value">
                    {d.latitude && d.longitude
                      ? `${d.latitude}, ${d.longitude}`
                      : "Coordinates N/A"}
                  </span>
                </div>
                <div className="card-actions">
                  <button
                    className="view-more-btn"
                    onClick={() => handleViewMore(d)}
                  >
                    View More Images
                  </button>
                  {buildMapsUrl(d) && (
                    <a
                      className="map-link-btn"
                      href={buildMapsUrl(d)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Map Location
                    </a>
                  )}
                </div>
              </div>
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
