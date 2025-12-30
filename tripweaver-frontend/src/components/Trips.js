import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./navbar";
import "./Trips.css";

const API_BASE = "http://localhost:8090/api";

function Trips() {
    const [formData, setFormData] = useState({
        origin: "",
        destination: "",
        startDate: "",
        endDate: "",
        budget: ""
    });
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const mockFlights = (o, d, dt) => {
        const baseDate = dt || new Date().toISOString().slice(0, 10);
        const airlines = ["IndiGo", "Air India", "Vistara", "SpiceJet"];
        return ["08:25", "15:40"].map((t, idx) => ({
            airline: airlines[idx],
            flightNumber: `${airlines[idx].slice(0, 2).toUpperCase()}${100 + idx}`,
            departureTime: `${baseDate} ${t}`,
            arrivalTime: `${baseDate} ${parseInt(t) + 3}:00`,
            departureAirport: o || "ORG",
            arrivalAirport: d || "DEST"
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        const { origin, destination, startDate, endDate, budget } = formData;

        if (!origin || !destination || !startDate || !endDate || !budget) {
            setError("Please fill in all travel details.");
            return;
        }

        setError("");
        setInfo("");
        setLoading(true);

        try {
            const res = await axios.get(`${API_BASE}/trip/search`, {
                params: {
                    origin: origin.trim().toUpperCase(),
                    destination: destination.trim(),
                    date: startDate,
                    budget: parseFloat(budget)
                },
                withCredentials: true,
            });

            const flights = res.data?.flights || [];
            const hotels = res.data?.hotels || [];

            if (flights.length === 0 && hotels.length === 0) {
                setInfo("No results found for your specific budget/dates.");
            }
            setTrip({ flights, hotels });
        } catch (err) {
            // Fallback for demo/dev purposes
            setTrip({ flights: mockFlights(origin, destination, startDate), hotels: [] });
            setInfo("Note: Showing sample flight data (API Offline).");
        } finally {
            setLoading(false);
        }
    };

    const calculateNights = () => {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    };

    return (
        <div className="trips-page">
            <Navbar />
            <div className="trips-container">
                <header className="trips-header">
                    <h2>Plan Your Trip</h2>
                    <p>Find the best flights and stays within your budget</p>
                </header>

                <form className="search-panel" onSubmit={handleSearch}>
                    <div className="input-row">
                        <div className="field">
                            <label>Origin</label>
                            <input name="origin" type="text" placeholder="e.g. HYD" value={formData.origin} onChange={handleInputChange} />
                        </div>
                        <div className="field">
                            <label>Destination</label>
                            <input name="destination" type="text" placeholder="e.g. Bangkok" value={formData.destination} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="field">
                            <label>Departure</label>
                            <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} />
                        </div>
                        <div className="field">
                            <label>Return</label>
                            <input name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} />
                        </div>
                        <div className="field">
                            <label>Budget/Night</label>
                            <input name="budget" type="number" placeholder="₹" value={formData.budget} onChange={handleInputChange} />
                        </div>
                    </div>
                    <button type="submit" className="search-btn" disabled={loading}>
                        {loading ? "Searching..." : "Search Trip"}
                    </button>
                </form>

                {error && <div className="msg-box error">{error}</div>}
                {info && <div className="msg-box info">{info}</div>}

                <div className="results-layout">
                    {trip && (
                        <>
                            <section className="results-column">
                                <h3 className="section-title">✈️ Available Flights</h3>
                                {trip.flights.map((f, i) => (
                                    <div key={i} className="trip-card flight">
                                        <div className="card-top">
                                            <span className="airline-tag">{f.airline}</span>
                                            <span className="flight-id">{f.flightNumber}</span>
                                        </div>
                                        <div className="flight-route">
                                            <div className="route-point">
                                                <strong>{f.departureTime.split(' ')[1]}</strong>
                                                <span>{f.departureAirport}</span>
                                            </div>
                                            <div className="route-line">✈️</div>
                                            <div className="route-point">
                                                <strong>{f.arrivalTime.split(' ')[1]}</strong>
                                                <span>{f.arrivalAirport}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>

                            <section className="results-column">
                                <h3 className="section-title">🏨 Recommended Hotels</h3>
                                {trip.hotels.map((h, i) => (
                                    <div key={i} className="trip-card hotel">
                                        <h4>{h.name}</h4>
                                        <p className="addr">{h.address}</p>
                                        <div className="hotel-footer">
                                            <span className="rating">⭐ {h.rating}</span>
                                            <div className="pricing">
                                                <span className="price">₹{h.price} / night</span>
                                                <span className="total">Total: ₹{h.price * calculateNights()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Trips;