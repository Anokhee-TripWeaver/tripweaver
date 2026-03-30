import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";
import axios from "axios";
import API_BASE from "../config";

export default function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [showGallery, setShowGallery] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    const showToast = (message, type = "info", duration = 2600) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, type });
        toastTimer.current = setTimeout(() => setToast(null), duration);
    };

    const username = sessionStorage.getItem("username") || localStorage.getItem("username");
    const email = sessionStorage.getItem("email") || localStorage.getItem("email");
    const cartKey = username ? `cart-${username}` : "cart";
    const legacyCartKey = "trip_cart";

    useEffect(() => {
        const readList = (key) => {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        };

        const scoped = readList(cartKey);
        const legacy = readList(legacyCartKey);
        const oldDefaultUserKey = readList("cart-TripWeaver User");
        const items = scoped.length > 0 ? scoped : (legacy.length > 0 ? legacy : oldDefaultUserKey);
        setCartItems(items);
        if (items.length > 0 && scoped.length === 0) {
            localStorage.setItem(cartKey, JSON.stringify(items));
        }
    }, [cartKey]);

    const removeFromCart = (id) => {
        const updatedCart = cartItems.filter(item => item.id !== id);
        setCartItems(updatedCart);
        localStorage.setItem(cartKey, JSON.stringify(updatedCart));
        localStorage.setItem(legacyCartKey, JSON.stringify(updatedCart));
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem(cartKey);
        localStorage.removeItem(legacyCartKey);
    };

    const handleCheckout = async () => {
        if (!username) {
            showToast("Please login to complete your booking.", "warning");
            navigate("/signup");
            return;
        }

        if (cartItems.length === 0) {
            showToast("Your cart is empty!", "warning");
            return;
        }

        const confirm = window.confirm(`Proceed to book ${cartItems.length} trips for Rs.${cartItems.reduce((sum, item) => sum + item.totalCost, 0)}?`);
        if (!confirm) return;

        try {
            // Process all bookings
            const bookingPromises = cartItems.map(item => {
                const bookingData = {
                    destination: item.destination,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    totalCost: item.totalCost,
                    flightDetails: item.flight ? JSON.stringify(item.flight) : null,
                    returnFlightDetails: item.returnFlight ? JSON.stringify(item.returnFlight) : null,
                    hotelDetails: item.hotel ? JSON.stringify(item.hotel) : null,
                    username: email || username // might be null if not logged in, but backend handles principal
                };
                return axios.post(`${API_BASE}/bookings/create`, bookingData, { withCredentials: true });
            });

            await Promise.all(bookingPromises);

            showToast("Booking successful! Your trips are confirmed.", "success");
            clearCart();
            navigate("/bookings");

        } catch (err) {
            console.error("Booking failed", err);
            showToast("Booking failed. Please try again.", "error");
        }
    };

    const openDetails = (item) => {
        setSelectedItem(item);
        setSelectedFlight(item.flight || null);
        setSelectedReturnFlight(item.returnFlight || null);
        setSelectedHotel(item.hotel || null);
        setShowDetails(true);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setSelectedItem(null);
        setSelectedFlight(null);
        setSelectedReturnFlight(null);
        setSelectedHotel(null);
    };

    const formatDateTime = (value) => {
        if (!value) return "";
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleString();
    };

    const buildMapsUrl = (hotel) => {
        if (!hotel || (!hotel.name && !hotel.address)) return null;
        const query = `${hotel.name || ""} ${hotel.address || ""}`.trim();
        if (!query) return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    };

    const openGallery = async (hotel) => {
        const initialPhotos =
            hotel.photoUrls && hotel.photoUrls.length > 0
                ? [...hotel.photoUrls]
                : hotel.photoUrl
                    ? [hotel.photoUrl]
                    : [];

        setShowGallery({
            ...hotel,
            photoUrls: initialPhotos
        });
        setCurrentImageIndex(0);

        if (hotel.placeId) {
            try {
                const res = await axios.get(`${API_BASE}/destination/photos/${hotel.placeId}`);
                const urls = res.data || [];
                if (urls.length > 0) {
                    setShowGallery(prev =>
                        prev
                            ? {
                                  ...prev,
                                  photoUrls: urls
                              }
                            : prev
                    );
                    setCurrentImageIndex(0);
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const closeGallery = () => {
        setShowGallery(null);
        setCurrentImageIndex(0);
    };

    const nextImage = (e) => {
        e.stopPropagation();
        if (showGallery && showGallery.photoUrls && showGallery.photoUrls.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % showGallery.photoUrls.length);
        }
    };

    const prevImage = (e) => {
        e.stopPropagation();
        if (showGallery && showGallery.photoUrls && showGallery.photoUrls.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + showGallery.photoUrls.length) % showGallery.photoUrls.length);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            paddingBottom: '40px'
        }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '100px auto 0', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '15px' }}>
                    <h2 style={{ color: 'white', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>ðŸ›’ My Cart</h2>
                    {cartItems.length > 0 && (
                        <button onClick={clearCart} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', backdropFilter: 'blur(5px)' }}>
                            Clear Cart
                        </button>
                    )}
                </div>

                {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'white', marginTop: '50px', background: 'rgba(0,0,0,0.5)', padding: '40px', borderRadius: '12px' }}>
                        <h3>Your cart is empty.</h3>
                        <button onClick={() => navigate('/trips')} style={{ marginTop: '20px', padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Start Planning
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {cartItems.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    padding: '25px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '20px',
                                }}
                            >
                                <div style={{ flex: 2, minWidth: '350px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                                        {item.hotel?.photoUrl && (
                                            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                                                <img
                                                    src={item.hotel.photoUrl}
                                                    alt={item.hotel.name}
                                                    style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
                                                />
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openGallery(item.hotel); }}
                                                    style={{
                                                        position: 'absolute', bottom: '5px', right: '5px',
                                                        background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                                                        padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
                                                        fontSize: '0.7rem'
                                                    }}
                                                >
                                                    ðŸ“· View
                                                </button>
                                            </div>
                                        )}
                                        <div>
                                            <h3 style={{ margin: 0, color: '#1b2a4e', fontSize: '1.4rem' }}>Trip to {item.destination}</h3>
                                            <p style={{ color: '#666', margin: '6px 0', fontSize: '1rem' }}>
                                                ðŸ“… {item.startDate} to {item.endDate} ({item.nights} Nights)
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: '10px', padding: '15px', background: '#f5f5f9', borderRadius: '10px' }}>
                                        <p style={{ margin: '5px 0' }}><strong>âœˆï¸ Flight:</strong> {item.flight?.airline} ({item.flight?.flightNumber})</p>
                                        {item.returnFlight && (
                                            <p style={{ margin: '5px 0' }}><strong>âœˆï¸ Return:</strong> {item.returnFlight?.airline} ({item.returnFlight?.flightNumber})</p>
                                        )}
                                        <p style={{ margin: '5px 0' }}><strong>ðŸ¨ Hotel:</strong> {item.hotel?.name}</p>
                                    </div>
                                </div>

                                <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ display: 'block', fontSize: '0.9rem', color: '#9092b0' }}>Estimated Total</span>
                                        <span style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#1b2a4e' }}>Rs.{item.totalCost}</span>
                                    </div>
                                    
                                    <button
                                        onClick={() => openDetails(item)}
                                        style={{
                                            marginTop: '10px',
                                            marginBottom: '6px',
                                            color: '#1a73e8',
                                            background: 'rgba(26,115,232,0.08)',
                                            borderRadius: '20px',
                                            padding: '6px 14px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        View Details
                                    </button>

                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        style={{
                                            marginTop: '10px',
                                            color: '#ff4444',
                                            background: 'rgba(255,68,68,0.08)',
                                            borderRadius: '20px',
                                            padding: '6px 14px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div
                            style={{
                                marginTop: '20px',
                                padding: '25px',
                                background: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '16px',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                border: '1px solid rgba(255,255,255,0.8)',
                                color: '#1b2a4e'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>Grand Total</span>
                                <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#1b2a4e' }}>
                                    Rs.{cartItems.reduce((sum, item) => sum + item.totalCost, 0)}
                                </span>
                            </div>
                            <p style={{ marginTop: 0, marginBottom: '20px', fontSize: '0.95rem', color: '#555' }}>
                                Prices are indicative and may vary at final booking.
                            </p>
                            <button
                                onClick={handleCheckout}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {showDetails && selectedItem && (
                <div
                    onClick={closeDetails}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            maxWidth: '600px',
                            width: '90%',
                            padding: '20px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>Trip to {selectedItem.destination}</h3>
                            <button
                                onClick={closeDetails}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer'
                                }}
                            >
                                âœ•
                            </button>
                        </div>
                        <p style={{ margin: '5px 0', color: '#555' }}>
                            {selectedItem.startDate} to {selectedItem.endDate} ({selectedItem.nights} Nights)
                        </p>
                        <hr />
                        <div style={{ marginTop: '10px', fontSize: '0.95rem', color: '#444' }}>
                            <p style={{ marginBottom: '6px' }}>
                                <strong>Flight Details</strong>
                            </p>
                            {selectedFlight ? (
                                <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Airline:</strong> {selectedFlight.airline} {selectedFlight.flightNumber}
                                    </p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>From:</strong> {selectedFlight.departureAirport} ({formatDateTime(selectedFlight.departureTime)})
                                    </p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>To:</strong> {selectedFlight.arrivalAirport} ({formatDateTime(selectedFlight.arrivalTime)})
                                    </p>
                                    {selectedFlight.price && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Price:</strong> {selectedFlight.price}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p style={{ margin: '4px 0' }}>No flight information.</p>
                            )}
                            {selectedReturnFlight && (
                                <>
                                    <p style={{ marginTop: '12px', marginBottom: '6px' }}>
                                        <strong>Return Flight</strong>
                                    </p>
                                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Airline:</strong> {selectedReturnFlight.airline} {selectedReturnFlight.flightNumber}
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>From:</strong> {selectedReturnFlight.departureAirport} ({formatDateTime(selectedReturnFlight.departureTime)})
                                        </p>
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>To:</strong> {selectedReturnFlight.arrivalAirport} ({formatDateTime(selectedReturnFlight.arrivalTime)})
                                        </p>
                                        {selectedReturnFlight.price && (
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Price:</strong> {selectedReturnFlight.price}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                            <p style={{ marginTop: '12px', marginBottom: '6px' }}>
                                <strong>Hotel Details</strong>
                            </p>
                            {selectedHotel ? (
                                <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Name:</strong> {selectedHotel.name}
                                    </p>
                                    {selectedHotel.address && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Address:</strong> {selectedHotel.address}
                                        </p>
                                    )}
                                    {selectedHotel.rating && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Rating:</strong> {selectedHotel.rating} â­
                                        </p>
                                    )}
                                    {selectedHotel.price && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Price per night:</strong> Rs.{selectedHotel.price}
                                        </p>
                                    )}
                                    {buildMapsUrl(selectedHotel) && (
                                        <a
                                            href={buildMapsUrl(selectedHotel)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-block',
                                                marginTop: '8px',
                                                color: '#1a73e8',
                                                textDecoration: 'underline',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Open in Google Maps
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <p style={{ margin: '4px 0' }}>No hotel information.</p>
                            )}
                            <p style={{ marginTop: '10px' }}>
                                <strong>Total Cost:</strong> Rs.{selectedItem.totalCost}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Gallery Modal */}
        {toast ? (
            <div
                style={{
                    position: "fixed",
                    right: "16px",
                    bottom: "16px",
                    minWidth: "240px",
                    maxWidth: "360px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    color: "#fff",
                    background:
                        toast.type === "success"
                            ? "linear-gradient(135deg,#16a34a,#15803d)"
                            : toast.type === "warning"
                            ? "linear-gradient(135deg,#d97706,#b45309)"
                            : toast.type === "error"
                            ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                            : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
                    zIndex: 2000,
                    fontWeight: 600,
                }}
            >
                {toast.message}
            </div>
        ) : null}

        {showGallery && (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                    <div style={{ position: 'relative', width: '90%', maxWidth: '1000px', height: '80%' }}>
                        <button 
                            onClick={closeGallery}
                            style={{
                                position: 'absolute', top: '-40px', right: '0',
                                background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer'
                            }}
                        >
                            Ã—
                        </button>
                        
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={prevImage} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', padding: '0 20px' }}>â€¹</button>
                            <img 
                                src={
                                    showGallery.photoUrls && showGallery.photoUrls.length > 0
                                        ? showGallery.photoUrls[currentImageIndex]
                                        : showGallery.photoUrl ||
                                          `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=60`
                                } 
                                alt="Room view" 
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                            <button onClick={nextImage} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', padding: '0 20px' }}>â€º</button>
                        </div>
                        
                        <div style={{ position: 'absolute', bottom: '-40px', width: '100%', textAlign: 'center', color: '#fff' }}>
                            {showGallery.photoUrls && showGallery.photoUrls.length > 0 ? `${currentImageIndex + 1} / ${showGallery.photoUrls.length}` : "1 / 1"}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

