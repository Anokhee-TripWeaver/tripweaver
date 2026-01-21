import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./navbar";

const API_BASE = "http://localhost:8090/api";

export default function Wishlist() {
    const [savedTrips, setSavedTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [showGallery, setShowGallery] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        fetchSavedTrips();
    }, []);

    const fetchSavedTrips = async () => {
        const username = sessionStorage.getItem("username");
        if (!username) {
            setSavedTrips([]);
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE}/trip/saved`, {
                params: { username },
                withCredentials: true
            });
            setSavedTrips(res.data);
        } catch (err) {
            console.error("Failed to fetch saved trips", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const username = sessionStorage.getItem("username");
        if (!username) {
            alert("Please log in to manage your wishlist.");
            return;
        }
        try {
            await axios.delete(`${API_BASE}/trip/saved/${id}`, {
                params: { username },
                withCredentials: true
            });
            setSavedTrips((prev) => prev.filter((t) => t.id !== id));
        } catch (err) {
            console.error("Failed to delete trip", err);
            alert("Failed to delete from wishlist. Please try again.");
        }
    };

    const openDetails = (trip) => {
        let flight = null;
        let returnFlight = null;
        let hotel = null;
        try {
            flight = trip.flightDetails ? JSON.parse(trip.flightDetails) : null;
        } catch (e) {}
        try {
            returnFlight = trip.returnFlightDetails ? JSON.parse(trip.returnFlightDetails) : null;
        } catch (e) {}
        try {
            hotel = trip.hotelDetails ? JSON.parse(trip.hotelDetails) : null;
        } catch (e) {}
        setSelectedTrip(trip);
        setSelectedFlight(flight);
        setSelectedReturnFlight(returnFlight);
        setSelectedHotel(hotel);
        setShowDetails(true);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setSelectedTrip(null);
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

    const calculateDuration = (dep, arr) => {
        if (!dep || !arr) return "";
        const start = new Date(dep);
        const end = new Date(arr);
        const diff = end - start;
        if (isNaN(diff)) return "";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const calculateNights = (start, end) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s) || isNaN(e)) return 0;
        return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
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
            backgroundImage: 'url("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            paddingBottom: '40px'
        }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '100px auto 0', padding: '20px' }}>
                <h2 style={{
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    borderBottom: '2px solid rgba(255,255,255,0.5)',
                    paddingBottom: '15px',
                    marginBottom: '30px'
                }}>
                    ❤️ My Wishlist
                </h2>

                {loading ? (
                    <p style={{ color: 'white' }}>Loading saved trips...</p>
                ) : savedTrips.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        color: 'white',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '40px',
                        borderRadius: '12px',
                        marginTop: '50px'
                    }}>
                        <h3>No saved trips found.</h3>
                        <p>Start planning and save your favorite itineraries!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
                        {savedTrips.map((trip) => {
                            const flight = JSON.parse(trip.flightDetails || "{}");
                            const hotel = JSON.parse(trip.hotelDetails || "{}");
                            const hotelImage = (hotel.photoUrls && hotel.photoUrls.length > 0) ? hotel.photoUrls[0] : (hotel.photoUrl || null);

                            return (
                                <div key={trip.id} style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '0',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {hotelImage ? (
                                        <div style={{ position: 'relative', height: '200px', width: '100%', overflow: 'hidden' }}>
                                            <img src={hotelImage} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openGallery(hotel); }}
                                                style={{
                                                    position: 'absolute', bottom: '10px', right: '10px',
                                                    background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                                                    padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                📷 View Rooms
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ height: '100px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                                            No Hotel Image
                                        </div>
                                    )}

                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h3 style={{ margin: 0, color: '#333' }}>{trip.destination}</h3>
                                            <span style={{ fontSize: '0.9rem', color: '#666' }}>{trip.startDate}</span>
                                        </div>

                                        <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '15px', flex: 1 }}>
                                            <p style={{ margin: '5px 0' }}><strong>✈️ Flight:</strong> {flight.airline} ({flight.flightNumber})</p>
                                            <p style={{ margin: '5px 0' }}><strong>🏨 Hotel:</strong> {hotel.name}</p>
                                            <p style={{ margin: '5px 0' }}><strong>💰 Total Cost:</strong> ₹{trip.totalCost}</p>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                            <button
                                                onClick={() => openDetails(trip)}
                                                style={{ flex: 1, padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                View Details
                                            </button>
                                            <button onClick={() => handleDelete(trip.id)} style={{ padding: '10px 15px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {showDetails && selectedTrip && (
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
                            <h3 style={{ margin: 0 }}>{selectedTrip.destination}</h3>
                            <button
                                onClick={closeDetails}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <p style={{ margin: '5px 0', color: '#555' }}>
                            {selectedTrip.startDate} to {selectedTrip.endDate} ({calculateNights(selectedTrip.startDate, selectedTrip.endDate)} nights)
                        </p>
                        <hr />
                        <div style={{ marginTop: '10px', fontSize: '0.95rem', color: '#444', maxHeight: '60vh', overflowY: 'auto' }}>
                            <p style={{ marginBottom: '6px' }}>
                                <strong>✈️ Flight Details</strong>
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
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Duration:</strong> {calculateDuration(selectedFlight.departureTime, selectedFlight.arrivalTime)}
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
                                        <strong>✈️ Return Flight</strong>
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
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Duration:</strong> {calculateDuration(selectedReturnFlight.departureTime, selectedReturnFlight.arrivalTime)}
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
                                <strong>🏨 Hotel Details</strong>
                            </p>
                            {selectedHotel ? (
                                <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
                                    {((selectedHotel.photoUrls && selectedHotel.photoUrls.length > 0) || selectedHotel.photoUrl) && (
                                        <div style={{ height: '150px', marginBottom: '10px', borderRadius: '4px', overflow: 'hidden' }}>
                                            <img 
                                                src={selectedHotel.photoUrls && selectedHotel.photoUrls.length > 0 ? selectedHotel.photoUrls[0] : selectedHotel.photoUrl} 
                                                alt={selectedHotel.name} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        </div>
                                    )}
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
                                            <strong>Rating:</strong> {selectedHotel.rating} ⭐
                                        </p>
                                    )}
                                    {selectedHotel.price && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Price per night:</strong> ₹{selectedHotel.price} x {calculateNights(selectedTrip.startDate, selectedTrip.endDate)} nights
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
                            <p style={{ marginTop: '15px', fontSize: '1.1rem', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                                <strong>💰 Total Cost:</strong> ₹{selectedTrip.totalCost}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Gallery Modal */}
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
                            ×
                        </button>
                        
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={prevImage} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', padding: '0 20px' }}>‹</button>
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
                            <button onClick={nextImage} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', padding: '0 20px' }}>›</button>
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
