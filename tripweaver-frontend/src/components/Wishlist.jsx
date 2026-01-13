import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./navbar";

const API_BASE = "http://localhost:8090/api";

export default function Wishlist() {
    const [savedTrips, setSavedTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSavedTrips();
    }, []);

    const fetchSavedTrips = async () => {
        try {
            const res = await axios.get(`${API_BASE}/trip/saved`, { withCredentials: true });
            setSavedTrips(res.data);
        } catch (err) {
            console.error("Failed to fetch saved trips", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        // Implement delete if backend supports it, for now just UI removal
        // For now, let's just alert
        alert("Delete functionality coming soon!");
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3c72, #2a5298)', paddingBottom: '40px' }}>
            <Navbar />
            <div style={{ maxWidth: '1000px', margin: '100px auto 0', padding: '20px' }}>
                <h2 style={{ color: 'white', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '15px', marginBottom: '30px' }}>
                    ❤️ My Wishlist
                </h2>

                {loading ? (
                    <p style={{ color: 'white' }}>Loading saved trips...</p>
                ) : savedTrips.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginTop: '50px' }}>
                        <h3>No saved trips found.</h3>
                        <p>Start planning and save your favorite itineraries!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {savedTrips.map((trip) => {
                            const flight = JSON.parse(trip.flightDetails || "{}");
                            const hotel = JSON.parse(trip.hotelDetails || "{}");
                            
                            return (
                                <div key={trip.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h3 style={{ margin: 0, color: '#333' }}>{trip.destination}</h3>
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>{trip.startDate}</span>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '15px' }}>
                                        <p><strong>✈️ Flight:</strong> {flight.airline} ({flight.flightNumber})</p>
                                        <p><strong>🏨 Hotel:</strong> {hotel.name}</p>
                                        <p><strong>💰 Total Cost:</strong> ₹{trip.totalCost}</p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button style={{ flex: 1, padding: '8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                            View Details
                                        </button>
                                        <button onClick={() => handleDelete(trip.id)} style={{ padding: '8px 12px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
