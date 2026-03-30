import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./navbar";
import { useNavigate } from "react-router-dom";
import "./Trips.css"; // Reuse styling for consistency
import API_BASE from "../config";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const looksLikeCollabPost = (item) => {
        // Published open-trip posts can leak into bookings; filter them out here.
        const seats = Number(item?.seatsAvailable);
        const isOpenTrip = item?.openTrip === true || seats > 0 || Boolean(item?.note);
        const hasBookingDate = Boolean(item?.bookingDate);
        const status = (item?.status || "").toString().trim().toUpperCase();
        const bookingStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
        const hasBookingSignal = hasBookingDate || bookingStatuses.includes(status);
        return isOpenTrip && !hasBookingSignal;
    };

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
    const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();
    const normalizeIdentity = (value) => (value || "").toString().trim().toLowerCase();
    const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
    const normalizeDateKey = (value) => {
        const raw = (value || "").toString().trim();
        if (!raw) return "";
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return raw;
        return d.toISOString().slice(0, 10);
    };
    const isAcceptedStatus = (value) => {
        const s = (value || "").toString().trim().toUpperCase();
        return ["ACCEPTED", "APPROVED", "CONFIRMED"].includes(s);
    };
    const isNonRejectedStatus = (value) => {
        const s = (value || "").toString().trim().toUpperCase();
        return s !== "REJECTED" && s !== "DECLINED";
    };

    useEffect(() => {
        let cancelled = false;

        const loadBookings = async () => {
            setLoading(true);
            try {
                const candidateSet = new Set(
                    [
                        sessionStorage.getItem("email"),
                        localStorage.getItem("email"),
                        sessionStorage.getItem("username"),
                        localStorage.getItem("username"),
                    ]
                        .map((v) => (v || "").toString().trim())
                        .filter(Boolean)
                );

                try {
                    const profileRes = await axios.get(`${API_BASE}/profile`, { withCredentials: true });
                    const profileData = profileRes?.data || {};
                    const profileEmail = resolveProfileEmail(profileData);
                    const profileName = resolveProfileName(profileData);
                    persistIdentity({ name: profileName, email: profileEmail });
                    if (profileEmail) candidateSet.add(profileEmail);
                    if (profileName) candidateSet.add(profileName);
                } catch {}

                const identifiers = [...candidateSet];
                if (identifiers.length === 0) {
                    if (!cancelled) setBookings([]);
                    return;
                }

                const ownLists = await Promise.all(
                    identifiers.map(async (identifier) => {
                        try {
                            const res = await axios.get(`${API_BASE}/bookings/my-bookings`, {
                                params: { username: identifier },
                                withCredentials: true,
                            });
                            return Array.isArray(res?.data) ? res.data : [];
                        } catch {
                            return [];
                        }
                    })
                );

                const ownBookings = ownLists.flat();
                const filteredOwnBookings = ownBookings.filter((b) => !looksLikeCollabPost(b));

                // Also include bookings from hosts of trips you've been accepted to join
                let acceptedRequests = [];
                try {
                    const reqLists = await Promise.all(
                        identifiers.map(async (identifier) => {
                            try {
                                const res = await axios.get(`${API_BASE}/collaboration-trips/join-requests/requester`, {
                                    params: { email: identifier },
                                    withCredentials: true,
                                });
                                return Array.isArray(res?.data) ? res.data : [];
                            } catch {
                                return [];
                            }
                        })
                    );
                    acceptedRequests = reqLists
                        .flat()
                        .filter((req) => isAcceptedStatus(req?.status) || isNonRejectedStatus(req?.status))
                        .map((req) => ({
                            hostEmail: normalizeEmail(req?.hostEmail || req?.email || req?.toEmail),
                            hostIdentity: normalizeIdentity(req?.hostEmail || req?.email || req?.toEmail || req?.hostName),
                            destination: normalizeText(req?.destination),
                            startDate: normalizeDateKey(req?.startDate),
                            endDate: normalizeDateKey(req?.endDate),
                            hostName: req?.hostName || "Trip Host",
                            updatedAt: req?.updatedAt || req?.createdAt,
                            postId: req?.postId,
                        }))
                        .filter((r) => r.hostEmail && r.destination);
                } catch {}

                const hostEmails = [...new Set(acceptedRequests.map((r) => r.hostEmail))];
                const hostBookingLists = await Promise.all(
                    hostEmails.map(async (hostEmail) => {
                        try {
                            const res = await axios.get(`${API_BASE}/bookings/my-bookings`, {
                                params: { username: hostEmail },
                                withCredentials: true,
                            });
                            const list = Array.isArray(res?.data) ? res.data : [];
                            return list.filter((b) => !looksLikeCollabPost(b));
                        } catch {
                            return [];
                        }
                    })
                );

                const sharedBookings = hostBookingLists
                    .flat()
                    .filter((b) =>
                        acceptedRequests.some(
                            (r) =>
                                (normalizeEmail(b?.username) === r.hostEmail ||
                                 normalizeIdentity(b?.username) === r.hostIdentity) &&
                                normalizeText(b?.destination) === r.destination &&
                                normalizeDateKey(b?.startDate) === r.startDate &&
                                normalizeDateKey(b?.endDate) === r.endDate
                        )
                    )
                    .map((b) => ({ ...b, _shared: true }));

                // Fallback synthetic entry if host bookings aren't reachable
                const syntheticBookings = acceptedRequests.map((r) => ({
                    id: r.postId || `${r.hostEmail}-${r.destination}-${r.startDate}`,
                    destination: r.destination,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    totalCost: "",
                    bookingDate: r.updatedAt || new Date().toISOString(),
                    username: r.hostEmail,
                    _ownerEmail: r.hostEmail,
                    hostName: r.hostName,
                    _shared: true,
                    _fromAcceptedRequest: true,
                }));

                const mergedByKey = new Map();
                [...filteredOwnBookings, ...sharedBookings, ...syntheticBookings].forEach((b) => {
                    const key =
                        b?.id != null
                            ? `id-${b.id}`
                            : `${normalizeEmail(b?.username)}-${normalizeText(b?.destination)}-${normalizeDateKey(b?.startDate)}-${normalizeDateKey(b?.endDate)}-${(b?.bookingDate || "").toString().trim()}`;
                    if (!mergedByKey.has(key)) mergedByKey.set(key, b);
                });

                const finalBookings = [...mergedByKey.values()].sort(
                    (a, b) => new Date(b.bookingDate || 0) - new Date(a.bookingDate || 0)
                );

                if (!cancelled) setBookings(finalBookings);
            } catch (err) {
                console.error("Failed to fetch bookings", err);
                if (!cancelled) setBookings([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadBookings();
        return () => {
            cancelled = true;
        };
    }, []);

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
