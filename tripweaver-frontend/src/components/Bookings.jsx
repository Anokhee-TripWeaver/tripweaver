import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./navbar";
import { useNavigate } from "react-router-dom";
import "./Trips.css"; // Reuse styling for consistency

const API_BASE = "http://localhost:8090/api";

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const username = sessionStorage.getItem("username");
    const email = sessionStorage.getItem("email");

    useEffect(() => {
        if (!username) {
            setLoading(false);
            return;
        }
        // Use email if available, otherwise username
        const identifier = email || username;
        axios.get(`${API_BASE}/bookings/my-bookings?username=${identifier}`, { withCredentials: true })
            .then(res => {
                setBookings(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch bookings", err);
                setLoading(false);
            });
    }, [username, email]);

    const formatDateTime = (val) => {
        if (!val) return "";
        return new Date(val).toLocaleString();
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
                <h2 style={{ color: 'white', margin: '0 0 30px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>📚 My Bookings</h2>
                
                {loading ? (
                    <p style={{ color: 'white' }}>Loading bookings...</p>
                ) : bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '40px', borderRadius: '12px' }}>
                        <h3>No bookings found.</h3>
                        <button onClick={() => navigate('/trips')} style={{ marginTop: '20px', padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Start Planning
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {bookings.map(booking => {
                            let flight = null;
                            let hotel = null;
                            try { flight = JSON.parse(booking.flightDetails); } catch(e) {}
                            try { hotel = JSON.parse(booking.hotelDetails); } catch(e) {}

                            return (
                                <div key={booking.id} style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '15px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#1b2a4e' }}>Trip to {booking.destination}</h3>
                                            <span style={{ fontSize: '0.9rem', color: '#555' }}>
                                                📅 {booking.startDate} - {booking.endDate}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#888' }}>Booked on {formatDateTime(booking.bookingDate)}</span>
                                            <span style={{ fontWeight: 'bold', color: '#2E7D32' }}>{booking.status}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {flight && (
                                            <div style={{ background: '#f5f5f9', padding: '10px', borderRadius: '8px' }}>
                                                <h4 style={{ margin: '0 0 5px 0' }}>✈️ Flight</h4>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{flight.airline} ({flight.flightNumber})</p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                                                    {flight.departureAirport} ➝ {flight.arrivalAirport}
                                                </p>
                                            </div>
                                        )}
                                        {hotel && (
                                            <div style={{ background: '#f5f5f9', padding: '10px', borderRadius: '8px' }}>
                                                <h4 style={{ margin: '0 0 5px 0' }}>🏨 Hotel</h4>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{hotel.name}</p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{hotel.address}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div style={{ textAlign: 'right', marginTop: '5px' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total: ₹{booking.totalCost}</span>
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
