import React, { useEffect, useState } from "react";
import axios from "axios";
import "./OpenTrips.css";
import API_BASE from "../config";
import { createJoinRequest } from "../utils/collaboration";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";

const STORAGE_KEY = "trip_collaboration_posts";

function OpenTrips() {
  // Line 10-14: Existing state
  const [posts, setPosts] = useState([]);
  const [syncMessage, setSyncMessage] = useState("");
  const [expandedById, setExpandedById] = useState({});
  
  // Line 18-19: ADD THESE TWO NEW STATE VARIABLES
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  
  const username =
    sessionStorage.getItem("username") || localStorage.getItem("username") || "TripWeaver User";
  const [email, setEmail] = useState(sessionStorage.getItem("email") || localStorage.getItem("email") || "");
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

  // Line 28-37: ADD THIS NEW useEffect FOR LOADING FROM LOCALSTORAGE
  useEffect(() => {
    const savedCart = localStorage.getItem("trip_cart");
    if (savedCart) setCartItems(JSON.parse(savedCart));
    
    const savedWishlist = localStorage.getItem("trip_wishlist");
    if (savedWishlist) setWishlistItems(JSON.parse(savedWishlist));
  }, []);

  // Line 40-46: ADD THESE TWO NEW useEffects FOR SAVING TO LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("trip_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("trip_wishlist", JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("email") || "";
    if (isValidEmail(savedEmail)) {
      setEmail(savedEmail);
      return;
    }

    axios
      .get(`${API_BASE}/profile`, { withCredentials: true })
      .then((res) => {
        const profileEmail = resolveProfileEmail(res?.data);
        const profileName = resolveProfileName(res?.data);
        if (isValidEmail(profileEmail)) {
          persistIdentity({ name: profileName, email: profileEmail });
          setEmail(profileEmail);
        }
      })
      .catch(() => {});
  }, []);

  // Line 67-79: ADD THESE HELPER FUNCTIONS
  const isInCart = (postId) => cartItems.some(item => item.id === postId);
  const isInWishlist = (postId) => wishlistItems.some(item => item.id === postId);

  const handleAddToCart = (post) => {
    if (isInCart(post.id)) {
      alert("Already in cart!");
      return;
    }
    
    const cartItem = {
      id: post.id,
      destination: post.destination,
      startDate: post.startDate,
      endDate: post.endDate,
      seatsAvailable: post.seatsAvailable,
      totalCost: post.totalCost,
      hostName: post.hostName
    };
    
    setCartItems([...cartItems, cartItem]);
    alert("Added to cart!");
  };

  const handleWishlistToggle = (post) => {
    if (isInWishlist(post.id)) {
      setWishlistItems(wishlistItems.filter(item => item.id !== post.id));
      alert("Removed from wishlist");
    } else {
      const wishlistItem = {
        id: post.id,
        destination: post.destination,
        startDate: post.startDate,
        endDate: post.endDate,
        seatsAvailable: post.seatsAvailable,
        totalCost: post.totalCost,
        hostName: post.hostName
      };
      setWishlistItems([...wishlistItems, wishlistItem]);
      alert("Added to wishlist!");
    }
  };

  // ... rest of your existing functions (getLocalPosts, sortPostsByCreatedAt, etc.) remain exactly the same ...
  // Line 81-400: ALL YOUR EXISTING FUNCTIONS STAY HERE UNCHANGED
  
  const getLocalPosts = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const sortPostsByCreatedAt = (items) =>
    [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

  const hasBookingDetails = (post) =>
    Boolean(post?.flightDetails || post?.returnFlightDetails || post?.hotelDetails);

  const mergeMissingDetailsFromSavedTrips = async (items) => {
    const list = Array.isArray(items) ? items : [];
    const targets = list.filter((post) => !hasBookingDetails(post) && post?.hostName);
    if (targets.length === 0) return list;

    const uniqueHosts = [...new Set(targets.map((post) => post.hostName).filter(Boolean))];
    const savedByHost = new Map();

    await Promise.all(
      uniqueHosts.map(async (hostName) => {
        try {
          const res = await axios.get(`${API_BASE}/trips/saved`, {
            params: { username: hostName },
            withCredentials: true,
          });
          const trips = Array.isArray(res?.data) ? res.data : [];
          savedByHost.set(hostName, trips);
        } catch {
          savedByHost.set(hostName, []);
        }
      })
    );

    return list.map((post) => {
      if (hasBookingDetails(post) || !post?.hostName) return post;
      const candidates = savedByHost.get(post.hostName) || [];
      const match = [...candidates]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .find((saved) =>
          normalizeText(saved.destination) === normalizeText(post.destination) &&
          normalizeText(saved.startDate) === normalizeText(post.startDate) &&
          normalizeText(saved.endDate) === normalizeText(post.endDate)
        );
      if (!match) return post;
      return {
        ...post,
        flightDetails: post.flightDetails || match.flightDetails || null,
        returnFlightDetails: post.returnFlightDetails || match.returnFlightDetails || null,
        hotelDetails: post.hotelDetails || match.hotelDetails || null,
      };
    });
  };

  const loadPosts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/collaboration-trips`, { withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const filtered = list.filter(
        (post) => isValidEmail(post.hostEmail || post.email) && (Number(post.seatsAvailable) || 0) > 0
      );
      const enriched = await mergeMissingDetailsFromSavedTrips(filtered);
      const hiddenCount = list.length - filtered.length;
      setPosts(sortPostsByCreatedAt(enriched));
      setSyncMessage(hiddenCount > 0 ? `${hiddenCount} trip(s) hidden due to invalid host email.` : "");
    } catch (error) {
      const localPosts = getLocalPosts();
      const filteredLocal = localPosts.filter(
        (post) => isValidEmail(post.hostEmail || post.email) && (Number(post.seatsAvailable) || 0) > 0
      );
      if (filteredLocal.length !== localPosts.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLocal));
      }
      const enrichedLocal = await mergeMissingDetailsFromSavedTrips(filteredLocal);
      setPosts(sortPostsByCreatedAt(enrichedLocal));
      setSyncMessage("Showing local posts. Backend sync is not available.");
    }
  };

  useEffect(() => {
    loadPosts();

    const reloadOnStorage = () => {
      const filteredLocal = getLocalPosts().filter(
        (post) => isValidEmail(post.hostEmail || post.email) && (Number(post.seatsAvailable) || 0) > 0
      );
      setPosts(sortPostsByCreatedAt(filteredLocal));
    };
    const reloadOnSeatUpdate = () => {
      loadPosts();
    };
    window.addEventListener("storage", reloadOnStorage);
    window.addEventListener("trip-collaboration-posts-updated", reloadOnSeatUpdate);
    return () => {
      window.removeEventListener("storage", reloadOnStorage);
      window.removeEventListener("trip-collaboration-posts-updated", reloadOnSeatUpdate);
    };
  }, []);

  const parseDetails = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const formatDateOnly = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDuration = (start, end) => {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
      return { days: 1, nights: 0 };
    }
    const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
    const dayDiff = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
    return { days: dayDiff + 1, nights: dayDiff };
  };

  const parseAmount = (value) => {
    if (value == null) return 0;
    const raw = String(value);
    const num = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) ? num : 0;
  };
  
  const toggleTripDetails = (postId) => {
    const key = String(postId);
    setExpandedById((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRequestToJoin = async (post) => {
    const hostEmail = post.hostEmail || post.email || "";
    const requesterEmail = email || "";

    if (!hostEmail) {
      alert("Host email is missing for this trip.");
      return;
    }
    if (!isValidEmail(hostEmail)) {
      alert("Host email is invalid. Please ask host to publish with a valid email.");
      return;
    }
    if (!isValidEmail(requesterEmail)) {
      alert("Your account email is invalid. Please update your email and try again.");
      return;
    }
    if ((hostEmail || "").toLowerCase() === requesterEmail.toLowerCase()) {
      alert("You cannot request to join your own trip.");
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/collaboration-trips/join-requests`,
        {
          postId: Number(post.id) || null,
          destination: post.destination,
          startDate: post.startDate,
          endDate: post.endDate,
          hostName: post.hostName || "Trip Host",
          hostEmail,
          requesterName: username,
          requesterEmail,
          status: "PENDING",
        },
        { withCredentials: true }
      );

      const requestResult = createJoinRequest({
        post: { ...post, hostEmail },
        requesterName: username,
        requesterEmail,
      });
      if (!requestResult.created && requestResult.reason === "DUPLICATE_PENDING") {
        alert("You already sent a pending request for this trip.");
        return;
      }
    } catch {
      const requestResult = createJoinRequest({
        post: { ...post, hostEmail },
        requesterName: username,
        requesterEmail,
      });
      if (!requestResult.created && requestResult.reason === "DUPLICATE_PENDING") {
        alert("You already sent a pending request for this trip.");
        return;
      }
    }

    try {
      const payload = {
        toEmail: hostEmail,
        hostName: post.hostName || "Trip Host",
        requesterName: username,
        requesterEmail,
        destination: post.destination,
        startDate: post.startDate,
        endDate: post.endDate,
      };

      await axios.post(`${API_BASE}/collaboration-trips/send-join-request-email`, payload, { withCredentials: true });
      alert("Join request email sent to host.");
    } catch (err) {
      console.error("Failed to send join request", err);
      alert("Failed to send join request email. Please try again.");
    }
  };

  return (
    <div className="open-trips-page">
      <div className="open-trips-container">
        <h2>Open Trips</h2>
        <p>Trips available to join for shared cost and company.</p>
        {syncMessage && <p className="open-trips-sync">{syncMessage}</p>}

        {posts.length === 0 ? (
          <div className="open-trips-empty">
            No open trips yet. Publish from the Trips summary page.
          </div>
        ) : (
          <div className="open-trips-list">
            {posts.map((post) => {
              const outbound = parseDetails(post.flightDetails);
              const inbound = parseDetails(post.returnFlightDetails);
              const hotel = parseDetails(post.hotelDetails);
              const duration = getDuration(post.startDate, post.endDate);
              const hotelNightly = parseAmount(hotel?.price);
              const hotelTotal = hotelNightly * duration.nights;
              const expanded = expandedById[String(post.id)];

              return (
                <article className="open-trips-card" key={post.id}>
                  <div className="open-trips-header">
                    <h3 className="open-trips-title">
                      {post.origin ? `${post.origin} -> ${post.destination}` : post.destination}
                    </h3>
                    <p className="open-trips-dates">
                      {formatDateOnly(post.startDate)} - {formatDateOnly(post.endDate)}
                    </p>
                  </div>

                  <div className="open-trips-badges">
                    <span className="open-trips-badge">Seats: {post.seatsAvailable}</span>
                    <span className="open-trips-badge">Total: Rs.{post.totalCost}</span>
                  </div>
                  
                  <div className="open-trips-actions-simple">
                    <button
                      onClick={() => handleWishlistToggle(post)}
                      className={`action-btn ${isInWishlist(post.id) ? "active-wishlist" : "wishlist"}`}
                    >
                      {isInWishlist(post.id) ? "Saved" : "Save"}
                    </button>
                    
                    <button
                      onClick={() => handleAddToCart(post)}
                      disabled={isInCart(post.id)}
                      className={`action-btn ${isInCart(post.id) ? "active-cart" : "cart"}`}
                    >
                      {isInCart(post.id) ? "Added" : "Add"}
                    </button>
                    
                    <button
                      className="open-trips-toggle"
                      type="button"
                      onClick={() => toggleTripDetails(post.id)}
                    >
                      {expanded ? "Hide Details" : "Show Details"}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="open-trips-meta">
                      <h4 className="open-trips-detail-title">Trip Details</h4>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">Destination</span>
                        <span className="open-trips-value">{post.destination || "N/A"}</span>
                      </div>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">Start Date</span>
                        <span className="open-trips-value">{formatDateOnly(post.startDate)}</span>
                      </div>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">End Date</span>
                        <span className="open-trips-value">{formatDateOnly(post.endDate)}</span>
                      </div>
                      <div className="open-trips-meta-row">
                        <span className="open-trips-label">Host</span>
                        <span className="open-trips-value">{post.hostName || "Trip Host"}</span>
                      </div>

                      <h4 className="open-trips-detail-title">Departure Flight</h4>
                      {outbound ? (
                        <>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Airline</span>
                            <span className="open-trips-value">{outbound.airline || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Flight No</span>
                            <span className="open-trips-value">{outbound.flightNumber || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">From/To</span>
                            <span className="open-trips-value">
                              {(outbound.departureAirport || "N/A")} to {(outbound.arrivalAirport || "N/A")}
                            </span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Departure</span>
                            <span className="open-trips-value">{formatDateTime(outbound.departureTime)}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Arrival</span>
                            <span className="open-trips-value">{formatDateTime(outbound.arrivalTime)}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Price</span>
                            <span className="open-trips-value">{outbound.price || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Stops</span>
                            <span className="open-trips-value">
                              {outbound.stops != null ? String(outbound.stops) : "N/A"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="open-trips-empty-line">Departure flight details not available.</p>
                      )}

                      <h4 className="open-trips-detail-title">Return Flight</h4>
                      {inbound ? (
                        <>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Airline</span>
                            <span className="open-trips-value">{inbound.airline || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Flight No</span>
                            <span className="open-trips-value">{inbound.flightNumber || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">From/To</span>
                            <span className="open-trips-value">
                              {(inbound.departureAirport || "N/A")} to {(inbound.arrivalAirport || "N/A")}
                            </span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Departure</span>
                            <span className="open-trips-value">{formatDateTime(inbound.departureTime)}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Arrival</span>
                            <span className="open-trips-value">{formatDateTime(inbound.arrivalTime)}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Price</span>
                            <span className="open-trips-value">{inbound.price || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Stops</span>
                            <span className="open-trips-value">
                              {inbound.stops != null ? String(inbound.stops) : "N/A"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="open-trips-empty-line">Return flight was not selected.</p>
                      )}

                      <h4 className="open-trips-detail-title">Hotel</h4>
                      {hotel ? (
                        <>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Hotel Name</span>
                            <span className="open-trips-value">{hotel.name || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Address</span>
                            <span className="open-trips-value">{hotel.address || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Rating</span>
                            <span className="open-trips-value">{hotel.rating || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Room Type</span>
                            <span className="open-trips-value">{hotel.roomType || "N/A"}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Price/Night</span>
                            <span className="open-trips-value">Rs.{hotelNightly || 0}</span>
                          </div>
                          <div className="open-trips-meta-row">
                            <span className="open-trips-label">Total Hotel Cost</span>
                            <span className="open-trips-value">Rs.{hotelTotal || 0}</span>
                          </div>
                        </>
                      ) : (
                        <p className="open-trips-empty-line">Hotel details not available.</p>
                      )}
                    </div>
                  ) : null}

                  {post.note && <p className="open-trips-note">{post.note}</p>}
                  <button className="open-trips-request" onClick={() => handleRequestToJoin(post)}>
                    Request to Join
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OpenTrips;

