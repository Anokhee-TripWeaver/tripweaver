import React, { useState } from "react";
import axios from "axios";
import Navbar from "./navbar";
import "./Trips.css";

const API_BASE = "http://localhost:8090/api"; // backend URL

function Trips() {
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [budget, setBudget] = useState("");
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);

    // Mock flights function (remains the same)
    const mockFlights = (o, d, dt) => {
        const baseDate = dt || new Date().toISOString().slice(0, 10);
        const times = ["08:25", "11:10", "15:40", "21:05"];
        const airlines = ["IndiGo", "Air India", "Vistara", "SpiceJet"];
        return times.map((t, idx) => ({
            airline: airlines[idx % airlines.length],
            flightNumber: `${airlines[idx % airlines.length].slice(0, 2).toUpperCase()}${100 + idx}`,
            departureTime: `${baseDate} ${t}`,
            arrivalTime: `${baseDate} ${t.split(':')[0]}:00 +${idx < 2 ? 2 : 3}h`, 
        }));
    };

    const handleSearch = async () => {
        setError("");
        setInfo("");
        setLoading(true);
        setTrip(null);

        const o = origin.trim().toUpperCase();
        const d = destination.trim();
        const depDate = startDate || new Date().toISOString().slice(0, 10);
        const userBudget = parseFloat(budget);
        
        let flights = [];
        let hotels = [];
        let fallbackMessages = [];

        if (!o || !d || !startDate || !endDate || !budget) {
            setError("Please fill in all fields (Origin, Destination, Start Date, End Date, Budget).");
            setLoading(false);
            return;
        }

        // Save Search History
        const username = localStorage.getItem("username");
        if (username) {
            axios.post(`${API_BASE}/user/${username}/history`, {
                origin: o,
                destination: d,
                date: depDate
            }).catch(err => console.error("Failed to save search history", err));
        }

        // --- Fetch Trip Data (Flights + Hotels) ---
        try {
            const res = await axios.get(`${API_BASE}/trip/search`, {
                params: { origin: o, destination: d, date: depDate, budget: userBudget }, 
                withCredentials: true,
            });
            flights = res.data?.flights || [];
            hotels = res.data?.hotels || [];
        } catch (err) {
            console.error("Trip API Error:", err.response || err.message);
            // Fallback for flights
            flights = mockFlights(o, d, depDate);
            fallbackMessages.push("API Error: Could not fetch complete trip data.");
        }

        // --- Final State Update ---
        setTrip({ flights, hotels });
        
        if (fallbackMessages.length > 0) {
            setInfo(fallbackMessages.join(' | ')); 
        } else if (flights.length === 0 && hotels.length === 0) {
            setInfo("No results found for your search criteria.");
        }
        
        setLoading(false);
    };

    return (
        <div className="trips-wrapper">
            <Navbar />
            <div className="trips-container">
                <h2>Plan Your Trip</h2>

                <div className="input-group">
                    <input
                        type="text"
                        placeholder="From (e.g. HYD)"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="To (City e.g. Bangkok, Phuket)"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                    />
                    <div style={{display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px'}}>
                        <span style={{fontSize: '0.8rem', color: '#666', marginLeft: '5px'}}>Start Date</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px'}}>
                        <span style={{fontSize: '0.8rem', color: '#666', marginLeft: '5px'}}>End Date</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <input
                        type="number"
                        placeholder="Max Price/Night ($)"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                    />
                    <button onClick={handleSearch} disabled={loading}>
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>

                {error && <p className="message error">{error}</p>}
                {info && <p className="message info">{info}</p>}

                {trip && (
                    <div className="results-section">
                        {trip.flights.length > 0 && (
                            <>
                                <h3>Available Flights</h3>
                                {trip.flights.map((f, i) => (
                                    <div key={i} className="card">
                                        <h4>{f.airline} ({f.flightNumber})</h4>
                                        <p><strong>Departure:</strong> {f.departureTime} ({f.departureAirport})</p>
                                        <p><strong>Arrival:</strong> {f.arrivalTime} ({f.arrivalAirport})</p>
                                        {f.price && <p style={{color: '#2ecc71', fontWeight: 'bold'}}>Price: {f.price}</p>}
                                    </div>
                                ))}
                            </>
                        )}

                        {trip.hotels.length > 0 && (
                            <>
                                <h3>Available Hotels</h3>
                                {trip.hotels.map((h, i) => {
                                    const start = new Date(startDate);
                                    const end = new Date(endDate);
                                    const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1);
                                    const totalCost = h.price * nights;

                                    return (
                                        <div key={i} className="card">
                                            <h4>{h.name}</h4>
                                            <p>{h.address}</p>
                                            <p><strong>Rating:</strong> {h.rating} / 5</p>
                                            <p style={{color: '#2ecc71', fontWeight: 'bold'}}>
                                                Price: ₹{h.price} / night 
                                                <span style={{color: '#555', fontSize: '0.9rem', fontWeight: 'normal'}}>
                                                     (Total: ${totalCost} for {nights} nights)
                                                </span>
                                            </p>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Trips;