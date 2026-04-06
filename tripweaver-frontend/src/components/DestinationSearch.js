import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Navbar from "./navbar";
import CustomModal from "./CustomModal";
import "./DestinationSearch.css";
import API_BASE from "../config";

export default function DestinationSearch() {
  const resultsRef = useRef(null);
  const urlLocation = useLocation();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("tourist_attraction");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalTitle, setModalTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Custom modal state
  const [customModal, setCustomModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "info"
  });

  const showModal = (title, message, type = "info") => {
    setCustomModal({ show: true, title, message, type });
  };

  const closeModal = () => {
    setCustomModal({ show: false, title: "", message: "", type: "info" });
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

      const res = await axios.get(url, { withCredentials: true });

      const normalized = (res.data || []).map((d) => ({
        name: d.name || "Unknown Place",
        address: d.address || "",
        category: d.category || "",
        latitude: d.latitude,
        longitude: d.longitude,
        placeId: d.placeId,
        rating: d.rating || null,
        userRatingCount: d.userRatingCount || null,
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

  // Auto-search from URL params (used by chatbot agent)
  useEffect(() => {
    const params = new URLSearchParams(urlLocation.search);
    const q = params.get('query');
    const cat = params.get('category');
    if (q) {
      setQuery(q);
      if (cat) setCategory(cat);
      // Trigger search after state updates
      setTimeout(() => {
        const btn = document.querySelector('.search-btn[type="submit"]');
        if (btn) btn.click();
      }, 200);
    }
  }, [urlLocation.search]);

  // View more images
  const handleViewMore = async (destination) => {
    if (!destination.placeId) {
      showModal("No Place ID", "No Place ID available for this destination.", "warning");
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE}/destination/photos/${destination.placeId}`,
        { withCredentials: true }
      );
      if (!res.data || res.data.length === 0) {
        showModal("No Photos", "No photos available for this destination.", "info");
        return;
      }
      setModalImages(res.data);
      setModalTitle(destination.name);
      setModalOpen(true);
      setCurrentIndex(0); // Start from first image
    } catch (err) {
      console.error(err);
      showModal("Fetch Failed", "Failed to fetch more images.", "error");
    }
  };

  return (
    <div className="explore-container" style={{
      minHeight: '100vh',
      backgroundImage: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      paddingBottom: '40px',
      position: 'relative'
    }}>
      {/* Light overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(240, 248, 255, 0.4))',
        zIndex: 0
      }}></div>

      <Navbar />
      <div style={{ height: "70px" }}></div>

      <div className="main-content" style={{ position: 'relative', zIndex: 1 }}>
        {/* Title Card */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{
            display: 'inline-block',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            padding: '20px 70px',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            color: '#1a1a1a',
            fontSize: '2.8rem',
            fontWeight: '600',
            margin: 0,
            border: '1px solid rgba(255, 255, 255, 0.6)'
          }}>Destination Finder</h2>
        </div>

        {/* Search Form Card */}
        <div style={{
          maxWidth: '900px',
          width: '90%',
          margin: '0 auto 50px',
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px)',
          padding: '40px 50px',
          borderRadius: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255, 255, 255, 0.4)'
        }}>
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
        </div>

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
                {d.rating && (
                  <span>
                    <strong>Rating:</strong>{" "}
                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                      {"★".repeat(Math.round(d.rating))}{"☆".repeat(5 - Math.round(d.rating))} {d.rating}
                    </span>
                  </span>
                )}
              </div>
              
              {/* Location Icon for Google Maps */}
              {(d.latitude && d.longitude) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    color: '#7b68ee',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    marginTop: '5px',
                    marginBottom: '5px',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>📍</span>
                  View on Google Maps
                </a>
              )}
              
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button onClick={() => setModalOpen(false)} style={{
              position: 'absolute', top: 10, right: 12,
              background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
              width: 30, height: 30, fontSize: '1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#333', fontWeight: 700, lineHeight: 1
            }}>✕</button>
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

            </div>
          </div>
       
      )}

      {/* Custom Modal */}
      <CustomModal
        show={customModal.show}
        title={customModal.title}
        message={customModal.message}
        type={customModal.type}
        onClose={closeModal}
      />
    </div>
  );
}
