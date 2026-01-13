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
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [returnFlights, setReturnFlights] = useState([]);
    const [compareList, setCompareList] = useState([]);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [showGallery, setShowGallery] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleFlightSelect = (flight) => {
        setSelectedFlight(flight);
        setStep(2);
        window.scrollTo(0, 0);
    };

    const handleReturnFlightSelect = (flight) => {
        setSelectedReturnFlight(flight);
        setStep(4);
        window.scrollTo(0, 0);
    };

    const handleSkipReturnFlight = () => {
        setSelectedReturnFlight(null);
        setStep(4);
        window.scrollTo(0, 0);
    };

    const handleHotelSelect = async (hotel) => {
        setSelectedHotel(hotel);
        setLoading(true);
        try {
            // Fetch return flights
            const res = await axios.get(`${API_BASE}/trip/search`, {
                params: {
                    origin: formData.destination.trim().toUpperCase(),
                    destination: formData.origin.trim().toUpperCase(),
                    date: formData.endDate,
                    budget: parseFloat(formData.budget)
                },
                withCredentials: true,
            });
            const flights = res.data?.flights || [];
            if (flights.length === 0) {
                 setReturnFlights(mockFlights(formData.destination, formData.origin, formData.endDate));
            } else {
                setReturnFlights(flights);
            }
        } catch (err) {
            setReturnFlights(mockFlights(formData.destination, formData.origin, formData.endDate));
        } finally {
            setLoading(false);
            setStep(3);
            window.scrollTo(0, 0);
        }
    };

    const addToCompare = (item, type) => {
        if (compareList.length >= 3) {
            alert("You can compare up to 3 items.");
            return;
        }
        if (compareList.some(i => i.id === item.id || (i.flightNumber && i.flightNumber === item.flightNumber) || (i.name && i.name === item.name))) {
            alert("Item already in comparison list.");
            return;
        }
        setCompareList([...compareList, { ...item, type }]);
    };

    const removeFromCompare = (index) => {
        const newList = [...compareList];
        newList.splice(index, 1);
        setCompareList(newList);
    };

    const openCompareModal = () => {
        if (compareList.length < 1) {
            alert("Select items to compare.");
            return;
        }
        setShowCompareModal(true);
    };

    const openGallery = (hotel) => {
        setShowGallery(hotel);
        setCurrentImageIndex(0);
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

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const mockFlights = (o, d, dt) => {
        const baseDate = dt || new Date().toISOString().slice(0, 10);
        const airlines = ["IndiGo", "Air India", "Vistara", "SpiceJet"];
        return ["08:25", "15:40"].map((t, idx) => ({
            airline: airlines[idx],
            flightNumber: `${airlines[idx].slice(0, 2).toUpperCase()}${100 + idx}`,
            departureTime: `${baseDate}T${t}:00`,
            arrivalTime: `${baseDate}T${parseInt(t) + 3}:00:00`,
            departureAirport: o || "ORG",
            arrivalAirport: d || "DEST",
            price: `${(3000 + idx * 1500)} INR`
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        const { origin, destination, startDate, endDate, budget } = formData;

        if (!origin || !destination || !startDate || !endDate || !budget) {
            setError("Please fill in all travel details.");
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            setError("Departure date cannot be in the past.");
            return;
        }

        if (end < start) {
            setError("Return date cannot be before departure date.");
            return;
        }

        setError("");
        setInfo("");
        setSelectedFlight(null);
        setSelectedHotel(null);
        setStep(1);
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
        if (!formData.startDate || !formData.endDate) return 1;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (isNaN(start) || isNaN(end)) return 1;
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    };

    const parsePrice = (priceStr) => {
        if (!priceStr) return 0;
        // Remove " INR" or other currency and commas
        return parseFloat(priceStr.replace(/[^0-9.]/g, ""));
    };

    const getTotalCost = () => {
        let total = 0;
        if (selectedFlight) {
            total += parsePrice(selectedFlight.price);
        }
        if (selectedReturnFlight) {
            total += parsePrice(selectedReturnFlight.price);
        }
        if (selectedHotel) {
            total += selectedHotel.price * calculateNights();
        }
        return total;
    };

    const getRemainingBudget = () => {
        const budget = parseFloat(formData.budget) || 0;
        return budget - getTotalCost();
    };

    const handleAddToCart = () => {
        const total = getTotalCost();
        const budget = parseFloat(formData.budget) || 0;
        
        if (total > budget) {
            alert(`⚠️ Warning: Your total trip cost (₹${total}) exceeds your budget (₹${budget})!`);
        }
        
        const cartItem = {
            id: Date.now(),
            destination: formData.destination,
            startDate: formData.startDate,
            endDate: formData.endDate,
            totalCost: total,
            flight: selectedFlight,
            returnFlight: selectedReturnFlight,
            hotel: selectedHotel,
            nights: calculateNights()
        };

        const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");
        localStorage.setItem("cart", JSON.stringify([...existingCart, cartItem]));

        alert(`✅ Added to cart! Total: ₹${total}`);
    };

    const handleSaveTrip = async () => {
        try {
            const tripData = {
                destination: formData.destination,
                startDate: formData.startDate,
                endDate: formData.endDate,
                totalCost: getTotalCost(),
                budget: parseFloat(formData.budget),
                flightDetails: JSON.stringify(selectedFlight),
                returnFlightDetails: selectedReturnFlight ? JSON.stringify(selectedReturnFlight) : null,
                hotelDetails: JSON.stringify(selectedHotel)
            };

            await axios.post(`${API_BASE}/trip/save`, tripData, { withCredentials: true });
            alert("Trip saved successfully to your wishlist!");
        } catch (err) {
            console.error(err);
            alert("Failed to save trip. Please try again.");
        }
    };

    return (
        <div className="trips-page">
            <Navbar />
            
            {/* Budget Tracker */}
            {formData.budget && (
                <div className="budget-tracker" style={{
                    position: 'fixed',
                    top: '80px',
                    right: '20px',
                    background: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    width: '250px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Budget Tracker</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Budget:</span>
                        <strong>₹{formData.budget}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Selected:</span>
                        <strong style={{ color: getTotalCost() > formData.budget ? 'red' : 'green' }}>₹{getTotalCost()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #eee' }}>
                        <span>Remaining:</span>
                        <strong style={{ color: getRemainingBudget() < 0 ? 'red' : 'blue' }}>₹{getRemainingBudget()}</strong>
                    </div>
                </div>
            )}

            {/* Compare Button */}
            {compareList.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000
                }}>
                    <button 
                        onClick={openCompareModal}
                        style={{
                            padding: '12px 24px',
                            background: '#673AB7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '30px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Compare ({compareList.length})
                    </button>
                </div>
            )}

            {/* Compare Modal */}
            {showCompareModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 1100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="modal-content" style={{
                        background: 'white', width: '90%', maxWidth: '1000px',
                        padding: '20px', borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3>Compare Options</h3>
                            <button onClick={() => setShowCompareModal(false)}>Close</button>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto' }}>
                            {compareList.map((item, idx) => (
                                <div key={idx} style={{ minWidth: '250px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                                    <button onClick={() => removeFromCompare(idx)} style={{ float: 'right', color: 'red' }}>x</button>
                                    <h4>{item.name || item.airline}</h4>
                                    {item.type === 'flight' ? (
                                        <>
                                            <p>Flight: {item.flightNumber}</p>
                                            <p>Price: {item.price}</p>
                                            <p>Time: {item.departureTime.split('T')[1]?.slice(0,5)} - {item.arrivalTime.split('T')[1]?.slice(0,5)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p>Rating: {item.rating} ⭐</p>
                                            <p>Price: ₹{item.price}/night</p>
                                            <p>Address: {item.address}</p>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                            <label>Total Budget</label>
                            <input name="budget" type="number" placeholder="₹" value={formData.budget} onChange={handleInputChange} />
                        </div>
                    </div>
                    <button type="submit" className="search-btn" disabled={loading}>
                        {loading ? "Searching..." : "Search Trip"}
                    </button>
                </form>

                {error && <div className="msg-box error">{error}</div>}
                {info && <div className="msg-box info">{info}</div>}

                {/* Progress Bar */}
                {trip && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '80%' }}>
                            <div style={{ background: step >= 1 ? '#4CAF50' : '#ddd', color: '#fff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>1</div>
                            <div style={{ flex: 1, height: '4px', background: step >= 2 ? '#4CAF50' : '#ddd' }}></div>
                            <div style={{ background: step >= 2 ? '#4CAF50' : '#ddd', color: '#fff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>2</div>
                            <div style={{ flex: 1, height: '4px', background: step >= 3 ? '#4CAF50' : '#ddd' }}></div>
                            <div style={{ background: step >= 3 ? '#4CAF50' : '#ddd', color: '#fff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>3</div>
                        </div>
                    </div>
                )}

                <div className="results-layout" style={{ display: 'block' }}>
                    {trip && (
                        <>
                            {/* Step 1: Flights */}
                            {step === 1 && (
                                <section className="results-column" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                                    <h3 className="section-title">✈️ Step 1: Select Flight</h3>
                                    {trip.flights.map((f, i) => (
                                        <div 
                                            key={i} 
                                            className={`trip-card flight`}
                                            style={{ marginBottom: '15px' }}
                                        >
                                            <div className="card-top">
                                                <span className="airline-tag">{f.airline}</span>
                                                <span className="flight-id">{f.flightNumber}</span>
                                            </div>
                                            <div className="flight-route">
                                                <div className="route-point">
                                                    <strong>{f.departureTime.split('T')[1]?.slice(0,5) || f.departureTime.split(' ')[1]}</strong>
                                                    <span>{f.departureAirport}</span>
                                                </div>
                                                <div className="route-line">✈️</div>
                                                <div className="route-point">
                                                    <strong>{f.arrivalTime.split('T')[1]?.slice(0,5) || f.arrivalTime.split(' ')[1]}</strong>
                                                    <span>{f.arrivalAirport}</span>
                                                </div>
                                            </div>
                                            <div className="flight-footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span className="price" style={{ fontWeight: 'bold', color: '#333' }}>
                                                    {f.price}
                                                </span>
                                                <button 
                                                    className="select-btn"
                                                    onClick={() => handleFlightSelect(f)}
                                                    style={{ padding: '8px 20px', backgroundColor: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Select Flight & Continue
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Step 2: Hotels */}
                            {step === 2 && (
                                <section className="results-column" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                                    <button 
                                        onClick={() => setStep(1)}
                                        style={{ marginBottom: '20px', padding: '8px 15px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        ← Back to Flights
                                    </button>
                                    <h3 className="section-title">🏨 Step 2: Select Hotel</h3>
                                    {trip.hotels.map((h, i) => (
                                        <div 
                                            key={i} 
                                            className={`trip-card hotel`}
                                            style={{ marginBottom: '20px' }}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <img 
                                                    src={h.photoUrl || `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=60`} 
                                                    alt={h.name}
                                                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} 
                                                />
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openGallery(h); }}
                                                    style={{
                                                        position: 'absolute', bottom: '20px', right: '10px',
                                                        background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                                                        padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                                                    }}
                                                >
                                                    📷 View Rooms
                                                </button>
                                            </div>
                                            <h4>{h.name}</h4>
                                            <p className="addr">📍 {h.address}</p>
                                            <div className="hotel-footer">
                                                <span className="rating">⭐ {h.rating}</span>
                                                <div className="pricing">
                                                    <span className="price" style={{ fontSize: '1.4rem' }}>₹{h.price * calculateNights()}</span>
                                                    <span className="total">for {calculateNights()} nights</span>
                                                </div>
                                            </div>
                                            <button 
                                                className="select-btn"
                                                onClick={() => handleHotelSelect(h)}
                                                style={{ width: '100%', marginTop: '10px', padding: '10px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Select Hotel & Continue
                                            </button>
                                            <button 
                                                onClick={() => addToCompare(h, 'hotel')}
                                                style={{ width: '100%', marginTop: '5px', padding: '8px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Compare Hotel
                                            </button>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Step 3: Return Flight */}
                            {step === 3 && (
                                <section className="results-column" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                                    <button 
                                        onClick={() => setStep(2)}
                                        style={{ marginBottom: '20px', padding: '8px 15px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        ← Back to Hotels
                                    </button>
                                    <h3 className="section-title">✈️ Step 3: Select Return Flight (Optional)</h3>
                                    
                                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                        <button 
                                            onClick={handleSkipReturnFlight}
                                            style={{ padding: '10px 30px', background: '#757575', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}
                                        >
                                            Skip Return Flight ➝
                                        </button>
                                    </div>

                                    {returnFlights.map((f, i) => (
                                        <div 
                                            key={i} 
                                            className={`trip-card flight`}
                                            style={{ marginBottom: '15px' }}
                                        >
                                            <div className="card-top">
                                                <span className="airline-tag">{f.airline}</span>
                                                <span className="flight-id">{f.flightNumber}</span>
                                            </div>
                                            <div className="flight-route">
                                                <div className="route-point">
                                                    <strong>{f.departureTime.split('T')[1]?.slice(0,5) || f.departureTime.split(' ')[1]}</strong>
                                                    <span>{f.departureAirport}</span>
                                                </div>
                                                <div className="route-line">✈️</div>
                                                <div className="route-point">
                                                    <strong>{f.arrivalTime.split('T')[1]?.slice(0,5) || f.arrivalTime.split(' ')[1]}</strong>
                                                    <span>{f.arrivalAirport}</span>
                                                </div>
                                            </div>
                                            <div className="flight-footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span className="price" style={{ fontWeight: 'bold', color: '#333' }}>
                                                    {f.price}
                                                </span>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button 
                                                        onClick={() => addToCompare(f, 'flight')}
                                                        style={{ padding: '8px 15px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                    >
                                                        Compare
                                                    </button>
                                                    <button 
                                                        className="select-btn"
                                                        onClick={() => handleReturnFlightSelect(f)}
                                                        style={{ padding: '8px 20px', backgroundColor: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                    >
                                                        Select Return Flight
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Step 4: Summary */}
                            {step === 4 && selectedFlight && selectedHotel && (
                                <section className="results-column" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                                    <button 
                                        onClick={() => setStep(3)}
                                        style={{ marginBottom: '20px', padding: '8px 15px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        ← Back to Return Flight
                                    </button>
                                    <h3 className="section-title">🧾 Step 4: Trip Summary & Pricing</h3>
                                    <div className="trip-card" style={{ padding: '20px' }}>
                                        <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Departure Flight</h4>
                                        <div style={{ margin: '10px 0' }}>
                                            <p><strong>Airline:</strong> {selectedFlight.airline} ({selectedFlight.flightNumber})</p>
                                            <p><strong>Route:</strong> {selectedFlight.departureAirport} ➝ {selectedFlight.arrivalAirport}</p>
                                            <p><strong>Time:</strong> {selectedFlight.departureTime.split('T')[1]?.slice(0,5)} - {selectedFlight.arrivalTime.split('T')[1]?.slice(0,5)}</p>
                                            <p><strong>Price:</strong> {selectedFlight.price}</p>
                                        </div>

                                        {selectedReturnFlight && (
                                            <>
                                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}>Return Flight</h4>
                                                <div style={{ margin: '10px 0' }}>
                                                    <p><strong>Airline:</strong> {selectedReturnFlight.airline} ({selectedReturnFlight.flightNumber})</p>
                                                    <p><strong>Route:</strong> {selectedReturnFlight.departureAirport} ➝ {selectedReturnFlight.arrivalAirport}</p>
                                                    <p><strong>Time:</strong> {selectedReturnFlight.departureTime.split('T')[1]?.slice(0,5)} - {selectedReturnFlight.arrivalTime.split('T')[1]?.slice(0,5)}</p>
                                                    <p><strong>Price:</strong> {selectedReturnFlight.price}</p>
                                                </div>
                                            </>
                                        )}

                                        <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}>Hotel Details</h4>
                                        <div style={{ margin: '10px 0' }}>
                                            <img 
                                                src={selectedHotel.photoUrl || `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=60`} 
                                                alt={selectedHotel.name}
                                                style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} 
                                            />
                                            <p><strong>Hotel:</strong> {selectedHotel.name}</p>
                                            <p><strong>Address:</strong> {selectedHotel.address}</p>
                                            <p><strong>Duration:</strong> {calculateNights()} Nights</p>
                                            <p><strong>Price:</strong> ₹{selectedHotel.price * calculateNights()}</p>
                                        </div>

                                        <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                <span>Total Trip Cost:</span>
                                                <span>₹{getTotalCost()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', color: '#666' }}>
                                                <span>Budget:</span>
                                                <span>₹{formData.budget}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', color: getRemainingBudget() < 0 ? 'red' : 'green' }}>
                                                <span>Remaining:</span>
                                                <span>₹{getRemainingBudget()}</span>
                                            </div>
                                            {getTotalCost() > (parseFloat(formData.budget) || 0) && (
                                                <p style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>⚠️ Exceeds Budget by ₹{getTotalCost() - parseFloat(formData.budget)}</p>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                            <button 
                                                className="select-btn"
                                                onClick={handleAddToCart}
                                                style={{ flex: 1, padding: '12px', backgroundColor: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                                            >
                                                Add to Cart
                                            </button>
                                            <button 
                                                className="select-btn"
                                                onClick={handleSaveTrip}
                                                style={{ flex: 1, padding: '12px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                                            >
                                                ❤️ Save Trip
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>

                {/* Gallery Modal */}
                {showGallery && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
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
                                    src={showGallery.photoUrls && showGallery.photoUrls.length > 0 ? showGallery.photoUrls[currentImageIndex] : showGallery.photoUrl} 
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
        </div>
    );
}

export default Trips;
