import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./navbar";
import PackingChecklist from "./PackingChecklist";
import LocalExperiences from "./LocalExperiences";
import { useNavigate } from "react-router-dom";
import "./Trips.css";
import API_BASE from "../config";

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
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
            backgroundImage: 'linear-gradient(rgba(240, 248, 255, 0.7), rgba(230, 245, 255, 0.7)), url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            paddingBottom: '40px'
        }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '100px auto 0', padding: '20px' }}>
                <h2 style={{ color: '#1a1a1a', margin: '0 0 30px', textShadow: '0 2px 4px rgba(255,255,255,0.9)', fontWeight: 'bold' }}>📚 My Bookings</h2>
                
                {loading ? (
                    <p style={{ color: '#1a1a1a', fontWeight: '500' }}>Loading bookings...</p>
                ) : bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#1a1a1a', background: 'rgba(255,255,255,0.95)', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
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
                                    
                                    <div style={{ textAlign: 'right', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedBooking(booking);
                                                setShowDetails(true);
                                            }}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                transition: 'transform 0.2s',
                                            }}
                                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                                        >
                                            📦 View Details & Checklist
                                        </button>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total: ₹{booking.totalCost}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Details Modal with Packing Checklist */}
            {showDetails && selectedBooking && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                    padding: '20px',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{
                            position: 'sticky',
                            top: 0,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '20px 30px',
                            borderRadius: '20px 20px 0 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 1
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Trip to {selectedBooking.destination}</h2>
                                <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
                                    {selectedBooking.startDate} - {selectedBooking.endDate}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: 'none',
                                    color: 'white',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                                onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '30px' }}>
                            {/* Trip Details */}
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ marginBottom: '15px', color: '#1a1a1a' }}>Trip Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {(() => {
                                        let flight = null;
                                        let hotel = null;
                                        try { flight = JSON.parse(selectedBooking.flightDetails); } catch(e) {}
                                        try { hotel = JSON.parse(selectedBooking.hotelDetails); } catch(e) {}
                                        
                                        return (
                                            <>
                                                {flight && (
                                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px' }}>
                                                        <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>✈️ Flight Details</h4>
                                                        <p style={{ margin: '5px 0' }}><strong>Airline:</strong> {flight.airline}</p>
                                                        <p style={{ margin: '5px 0' }}><strong>Flight:</strong> {flight.flightNumber}</p>
                                                        <p style={{ margin: '5px 0' }}><strong>Route:</strong> {flight.departureAirport} → {flight.arrivalAirport}</p>
                                                    </div>
                                                )}
                                                {hotel && (
                                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px' }}>
                                                        <h4 style={{ margin: '0 0 10px 0', color: '#764ba2' }}>🏨 Hotel Details</h4>
                                                        <p style={{ margin: '5px 0' }}><strong>Name:</strong> {hotel.name}</p>
                                                        <p style={{ margin: '5px 0' }}><strong>Address:</strong> {hotel.address}</p>
                                                        {hotel.rating && <p style={{ margin: '5px 0' }}><strong>Rating:</strong> {hotel.rating} ⭐</p>}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Packing Checklist */}
                            <PackingChecklist bookingId={selectedBooking.id} destination={selectedBooking.destination} />

                            {/* Local Experiences */}
                            <LocalExperiences destination={selectedBooking.destination} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
