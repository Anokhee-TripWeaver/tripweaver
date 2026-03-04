import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./navbar";
import { useLocation } from "react-router-dom";
import "./Trips.css";
import { createJoinRequest } from "../utils/collaboration";
import { persistIdentity, resolveProfileEmail, resolveProfileName } from "../utils/userIdentity";

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
    const [collabForm, setCollabForm] = useState({
        hostName: "",
        hostEmail: "",
        seatsAvailable: 1,
        note: ""
    });
    const [collaborationPosts, setCollaborationPosts] = useState([]);
    const [collabMessage, setCollabMessage] = useState("");
    const [dateErrors, setDateErrors] = useState({
        startDate: "",
        endDate: ""
    });
    const [popupMessage, setPopupMessage] = useState("");
    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

    const username = sessionStorage.getItem("username") || localStorage.getItem("username");
    const [userEmail, setUserEmail] = useState(
        sessionStorage.getItem("email") || localStorage.getItem("email") || ""
    );
    const cartKey = username ? `cart-${username}` : "cart";
    const location = useLocation();

    useEffect(() => {
        if (location.state?.restore) {
            const h = location.state.restore;

            const newFormData = {
                origin: h.origin || "",
                destination: h.destination || "",
                startDate: h.searchDate || "",
                endDate: "",
                budget: ""
            };
            setFormData(newFormData);
            setStep(1);
            return;
        }

        const savedSession = sessionStorage.getItem("trip_session");
        if (savedSession) {
            try {
                const data = JSON.parse(savedSession);
                setFormData(data.formData);
                setTrip(data.trip);
                setSelectedFlight(data.selectedFlight);
                setSelectedReturnFlight(data.selectedReturnFlight);
                setSelectedHotel(data.selectedHotel);
                setReturnFlights(data.returnFlights);
                setStep(data.step);
            } catch (e) {
                console.error("Failed to restore session", e);
            }
        }
    }, []);

    useEffect(() => {
        fetchCollaborationPosts();
        const reloadPosts = () => fetchCollaborationPosts();
        window.addEventListener("storage", reloadPosts);
        window.addEventListener("trip-collaboration-posts-updated", reloadPosts);
        return () => {
            window.removeEventListener("storage", reloadPosts);
            window.removeEventListener("trip-collaboration-posts-updated", reloadPosts);
        };
    }, []);

    useEffect(() => {
        const savedEmail = sessionStorage.getItem("email") || "";
        if (isValidEmail(savedEmail)) {
            setUserEmail(savedEmail);
            return;
        }

        axios.get(`${API_BASE}/profile`, { withCredentials: true })
            .then((res) => {
                const profileEmail = resolveProfileEmail(res?.data);
                const profileName = resolveProfileName(res?.data);
                if (isValidEmail(profileEmail)) {
                    persistIdentity({ name: profileName, email: profileEmail });
                    setUserEmail(profileEmail);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        setCollabForm({
            hostName: username || "",
            hostEmail: userEmail || "",
            seatsAvailable: 1,
            note: ""
        });
    }, [username, userEmail]);

    useEffect(() => {
        const sessionData = {
            formData,
            trip,
            selectedFlight,
            selectedReturnFlight,
            selectedHotel,
            returnFlights,
            step
        };
        sessionStorage.setItem("trip_session", JSON.stringify(sessionData));
    }, [formData, trip, selectedFlight, selectedReturnFlight, selectedHotel, returnFlights, step]);

    useEffect(() => {
        setCompareList([]);
        setShowCompareModal(false);
    }, [step]);

    const handleFlightSelect = (flight) => {
        setSelectedFlight(flight);
        setSelectedHotel(null);
        setSelectedReturnFlight(null);
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
        setSelectedReturnFlight(null);
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/trips/search`, {
                params: {
                    origin: formData.destination.trim().toUpperCase(),
                    destination: formData.origin.trim().toUpperCase(),
                    date: formData.endDate,
                    budget: parseFloat(formData.budget)
                },
                withCredentials: true,
            });
            const flights = Array.isArray(res.data?.flights)
                ? res.data.flights
                : [];
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
        const existingIndex = compareList.findIndex(
            i =>
                i.type === type &&
                ((i.id && item.id && i.id === item.id) ||
                    (i.flightNumber && item.flightNumber && i.flightNumber === item.flightNumber) ||
                    (i.name && item.name && i.name === item.name))
        );

        if (existingIndex !== -1) {
            const updated = [...compareList];
            updated.splice(existingIndex, 1);
            setCompareList(updated);
            return;
        }

        if (compareList.length > 0 && compareList[0].type !== type) {
            alert("You can only compare flights with flights or hotels with hotels.");
            return;
        }

        if (compareList.length >= 2) {
            alert("You can compare up to 2 options at a time.");
            return;
        }

        setCompareList([...compareList, { ...item, type }]);
    };

    const openCompareModal = () => {
        if (compareList.length !== 2) {
            alert("Select exactly two options to compare.");
            return;
        }
        setShowCompareModal(true);
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

    const getTodayDateString = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    };

    const isPastDate = (dateStr) => {
        if (!dateStr) return false;
        const selected = new Date(dateStr);
        selected.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected < today;
    };

    const validateDates = (nextFormData) => {
        const errors = { startDate: "", endDate: "" };
        const { startDate, endDate } = nextFormData;

        if (isPastDate(startDate)) {
            errors.startDate = "Departure date cannot be in the past.";
        }
        if (isPastDate(endDate)) {
            errors.endDate = "Return date cannot be in the past.";
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end < start) {
                errors.endDate = "Return date cannot be before departure date.";
            }
        }
        return errors;
    };

    const hasDateErrors = (errors) => Boolean(errors.startDate || errors.endDate);

    const showPopup = (message) => {
        setPopupMessage(message);
        window.setTimeout(() => setPopupMessage(""), 2600);
    };

    const handleInputChange = (e) => {
        const nextFormData = { ...formData, [e.target.name]: e.target.value };
        setFormData(nextFormData);
        setDateErrors(validateDates(nextFormData));
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

    const isFutureFlight = (flight) => {
        if (!flight?.departureTime) return false;
        const departure = new Date(flight.departureTime);
        if (isNaN(departure)) return false;
        return departure.getTime() >= Date.now();
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        const { origin, destination, startDate, endDate, budget } = formData;

        if (!origin || !destination || !startDate || !endDate || !budget) {
            setError("Please fill in all travel details.");
            return;
        }

        const computedDateErrors = validateDates(formData);
        setDateErrors(computedDateErrors);
        if (hasDateErrors(computedDateErrors)) {
            const firstError = computedDateErrors.startDate || computedDateErrors.endDate;
            setError(firstError);
            showPopup(firstError);
            return;
        }

        setError("");
        setInfo("");
        setSelectedFlight(null);
        setSelectedHotel(null);
        setStep(1);
        setLoading(true);

        try {
            const res = await axios.get(`${API_BASE}/trips/search`, {
                params: {
                    origin: origin.trim().toUpperCase(),
                    destination: destination.trim(),
                    date: startDate,
                    budget: parseFloat(budget)
                },
                withCredentials: true,
            });

            const flights = (Array.isArray(res.data?.flights) ? res.data.flights : []).filter(isFutureFlight);
            const hotels = Array.isArray(res.data?.hotels) ? res.data.hotels : [];

            if (flights.length === 0 && hotels.length === 0) {
                setTrip({ flights: mockFlights(origin, destination, startDate).filter(isFutureFlight), hotels: [] });
                setInfo("Search API returned no flight/hotel payload. Showing sample flight data.");
                return;
            }
            setTrip({ flights, hotels });
        } catch (err) {
            setTrip({ flights: mockFlights(origin, destination, startDate).filter(isFutureFlight), hotels: [] });
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

    const getFlightDurationMinutes = (flight) => {
        if (!flight || !flight.departureTime || !flight.arrivalTime) return null;
        const dep = new Date(flight.departureTime);
        const arr = new Date(flight.arrivalTime);
        const diffMs = arr - dep;
        if (isNaN(diffMs) || diffMs <= 0) return null;
        return Math.round(diffMs / (1000 * 60));
    };

    const formatDuration = (minutes) => {
        if (minutes == null) return "N/A";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const getOptionTotalCost = (item, type) => {
        if (!item) return 0;
        if (type === "flight") {
            return parsePrice(item.price);
        }
        if (type === "hotel") {
            return (item.price || 0) * calculateNights();
        }
        return 0;
    };

    const getBaseCostForComparison = (type) => {
        const budget = parseFloat(formData.budget) || 0;
        if (!budget) return 0;

        let base = 0;
        if (type === "flight") {
            if (step >= 2 && selectedFlight) {
                base += parsePrice(selectedFlight.price);
            }
            if (step >= 3 && selectedHotel) {
                base += selectedHotel.price * calculateNights();
            }
        } else if (type === "hotel") {
            if (selectedFlight) {
                base += parsePrice(selectedFlight.price);
            }
        }
        return base;
    };

    const isOptionOverBudget = (item, type) => {
        const budget = parseFloat(formData.budget) || 0;
        if (!budget) return false;
        const totalWithOption = getBaseCostForComparison(type) + getOptionTotalCost(item, type);
        return totalWithOption > budget;
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

        const existingCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
        localStorage.setItem(cartKey, JSON.stringify([...existingCart, cartItem]));

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
                hotelDetails: JSON.stringify(selectedHotel),
                username,
                email: userEmail
            };

            await axios.post(`${API_BASE}/trips/save`, tripData, { withCredentials: true });
            alert("Trip saved successfully to your wishlist!");
        } catch (err) {
            console.error(err);
            alert("Failed to save trip. Please try again.");
        }
    };

    const buildMapsUrl = (hotel) => {
        if (!hotel || (!hotel.name && !hotel.address)) return null;
        const query = `${hotel.name || ""} ${hotel.address || ""}`.trim();
        if (!query) return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    };

    const getCostPerPerson = (totalCost, seatsAvailable) => {
        const seatCount = Math.max(1, Number(seatsAvailable) || 1);
        return Math.ceil(totalCost / (seatCount + 1));
    };

    const getLocalCollaborationPosts = () => {
        const savedPosts = localStorage.getItem("trip_collaboration_posts");
        if (!savedPosts) return [];
        try {
            const parsed = JSON.parse(savedPosts);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const saveLocalCollaborationPosts = (posts) => {
        localStorage.setItem("trip_collaboration_posts", JSON.stringify(posts));
    };

    const sortPostsByCreatedAt = (posts) =>
        [...posts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const fetchCollaborationPosts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/collaboration-trips`, { withCredentials: true });
            const posts = (Array.isArray(res.data) ? res.data : []).filter(
                (post) => isValidEmail(post.hostEmail || post.email) && (Number(post.seatsAvailable) || 0) > 0
            );
            setCollaborationPosts(sortPostsByCreatedAt(posts));
        } catch (err) {
            const localPosts = getLocalCollaborationPosts();
            const filteredLocal = localPosts.filter(
                (post) => isValidEmail(post.hostEmail || post.email) && (Number(post.seatsAvailable) || 0) > 0
            );
            if (filteredLocal.length !== localPosts.length) {
                saveLocalCollaborationPosts(filteredLocal);
            }
            setCollaborationPosts(sortPostsByCreatedAt(filteredLocal));
        }
    };

    const handlePublishCollaboration = async () => {
        const totalCost = getTotalCost();
        const normalizedHostEmail = (userEmail || collabForm.hostEmail || "").trim().toLowerCase();
        if (!selectedFlight || !selectedHotel || !formData.destination || !formData.startDate || !formData.endDate) {
            setCollabMessage("Please finish your trip selection before publishing.");
            return;
        }
        if (!normalizedHostEmail) {
            setCollabMessage("Your account email is required so requests reach your profile.");
            return;
        }
        if (!isValidEmail(normalizedHostEmail)) {
            setCollabMessage("Please enter a valid host email (example: name@gmail.com).");
            return;
        }

        const openTripPayload = {
            destination: formData.destination,
            startDate: formData.startDate,
            endDate: formData.endDate,
            totalCost,
            budget: parseFloat(formData.budget),
            flightDetails: JSON.stringify(selectedFlight),
            returnFlightDetails: selectedReturnFlight ? JSON.stringify(selectedReturnFlight) : null,
            hotelDetails: JSON.stringify(selectedHotel),
            username: collabForm.hostName || username || "Traveler",
            email: normalizedHostEmail,
            openTrip: true,
            seatsAvailable: Math.max(1, Math.min(10, Number(collabForm.seatsAvailable) || 1)),
            note: collabForm.note || ""
        };

        try {
            await axios.post(`${API_BASE}/trips/save`, openTripPayload, { withCredentials: true });
            await fetchCollaborationPosts();
            setCollabMessage("Trip published. Other travelers can now request to join by email.");
        } catch (err) {
            const localPost = {
                id: Date.now(),
                hostName: openTripPayload.username,
                hostEmail: openTripPayload.email,
                origin: formData.origin,
                destination: openTripPayload.destination,
                startDate: openTripPayload.startDate,
                endDate: openTripPayload.endDate,
                totalCost: openTripPayload.totalCost,
                seatsAvailable: openTripPayload.seatsAvailable,
                note: openTripPayload.note,
                flightDetails: openTripPayload.flightDetails,
                returnFlightDetails: openTripPayload.returnFlightDetails,
                hotelDetails: openTripPayload.hotelDetails,
                createdAt: new Date().toISOString()
            };
            const localPosts = sortPostsByCreatedAt([localPost, ...getLocalCollaborationPosts()]);
            saveLocalCollaborationPosts(localPosts);
            setCollaborationPosts(localPosts);
            setCollabMessage("Published locally. Backend sync is not available right now.");
        }
    };

    const getTimeText = (dateTime) => dateTime?.split('T')[1]?.slice(0, 5) || dateTime?.split(' ')[1] || "";

    const sectionStyle = { width: '100%', maxWidth: '800px', margin: '0 auto' };
    const backBtnStyle = { marginBottom: '20px', padding: '8px 15px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' };
    const flightFooterStyle = { marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const compareLabelStyle = { fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' };
    const primaryFlightBtnStyle = { padding: '8px 20px', backgroundColor: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

    const handleRequestToJoin = async (post) => {
        const hostEmail = post.hostEmail || post.email || "";
        const requesterEmail = userEmail || "";
        const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

        if (!hostEmail) {
            alert("Host email is missing for this trip.");
            return;
        }
        if (!isValidEmail(hostEmail)) {
            alert("Host email is invalid. Ask host to publish with a valid email.");
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
                    requesterName: username || "TripWeaver User",
                    requesterEmail,
                    status: "PENDING",
                },
                { withCredentials: true }
            );

            const requestResult = createJoinRequest({
                post: { ...post, hostEmail },
                requesterName: username || "TripWeaver User",
                requesterEmail
            });
            if (!requestResult.created && requestResult.reason === "DUPLICATE_PENDING") {
                alert("You already sent a pending request for this trip.");
                return;
            }
        } catch {
            const requestResult = createJoinRequest({
                post: { ...post, hostEmail },
                requesterName: username || "TripWeaver User",
                requesterEmail
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
                requesterName: username || "TripWeaver User",
                requesterEmail,
                destination: post.destination,
                startDate: post.startDate,
                endDate: post.endDate
            };

            await axios.post(`${API_BASE}/collaboration-trips/send-join-request-email`, payload, { withCredentials: true });
            alert("Join request email sent to host.");
        } catch (err) {
            console.error("Failed to send join request", err);
            alert("Failed to send join request email. Please try again.");
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

            {/* Compare Button (enabled only when exactly two items are selected) */}
            {compareList.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000
                }}>
                    <button
                        onClick={openCompareModal}
                        disabled={compareList.length !== 2}
                        style={{
                            padding: '12px 24px',
                            background: compareList.length === 2 ? '#673AB7' : '#B39DDB',
                            color: 'white',
                            border: 'none',
                            borderRadius: '30px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            cursor: compareList.length === 2 ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            opacity: compareList.length === 2 ? 1 : 0.7
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

                        {compareList.length === 2 && (
                            <>
                                {compareList[0].type === "flight" ? (
                                    <div>
                                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#555' }}>
                                            Comparing flights based on price, duration, stops, airline and departure time.
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
                                            {compareList.map((flight, idx) => {
                                                const duration = getFlightDurationMinutes(flight);
                                                const price = getOptionTotalCost(flight, "flight");
                                                const overBudget = isOptionOverBudget(flight, "flight");
                                                const other = compareList[1 - idx];
                                                const otherDuration = getFlightDurationMinutes(other);
                                                const otherPrice = getOptionTotalCost(other, "flight");

                                                const isCheapest = price <= otherPrice;
                                                const isShortest = duration != null && (otherDuration == null || duration <= otherDuration);

                                                return (
                                                    <div key={idx} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                                                            {flight.airline} ({flight.flightNumber})
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            {flight.departureAirport} ➝ {flight.arrivalAirport}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Price:</strong>{" "}
                                                            <span style={{ color: isCheapest ? 'green' : '#333' }}>
                                                                ₹{price}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Total duration:</strong>{" "}
                                                            <span style={{ color: isShortest ? 'green' : '#333' }}>
                                                                {formatDuration(duration)}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Stops:</strong> {typeof flight.stops === "number" ? flight.stops : 0}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                                                            <strong>Departure time:</strong>{" "}
                                                            {flight.departureTime.split('T')[1]?.slice(0,5) || flight.departureTime.split(' ')[1]}
                                                        </div>

                                                        {overBudget && (
                                                            <div style={{ fontSize: '0.85rem', color: 'red', marginBottom: '6px' }}>
                                                                Over remaining budget for this step.
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                if (overBudget) return;
                                                                if (step === 1) {
                                                                    handleFlightSelect(flight);
                                                                } else if (step === 3) {
                                                                    handleReturnFlightSelect(flight);
                                                                }
                                                                setShowCompareModal(false);
                                                            }}
                                                            disabled={overBudget}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                background: overBudget ? '#ccc' : '#2196F3',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: overBudget ? 'not-allowed' : 'pointer',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.9rem'
                                                            }}
                                                        >
                                                            {overBudget ? "Over Budget" : "Choose this Flight"}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#555' }}>
                                            Comparing hotels based on price per night, rating, location and amenities.
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
                                            {compareList.map((hotel, idx) => {
                                                const pricePerNight = hotel.price || 0;
                                                const total = getOptionTotalCost(hotel, "hotel");
                                                const overBudget = isOptionOverBudget(hotel, "hotel");
                                                const other = compareList[1 - idx];
                                                const otherPrice = other.price || 0;

                                                const isCheapest = pricePerNight <= otherPrice;

                                                return (
                                                    <div key={idx} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                                                            {hotel.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Location:</strong> {hotel.address}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Price per night:</strong>{" "}
                                                            <span style={{ color: isCheapest ? 'green' : '#333' }}>
                                                                ₹{pricePerNight}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Total for stay:</strong> ₹{total}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <strong>Rating:</strong> {hotel.rating} ⭐
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                                                            <strong>Amenities:</strong> {hotel.roomType || "Standard amenities"}
                                                        </div>

                                                        {overBudget && (
                                                            <div style={{ fontSize: '0.85rem', color: 'red', marginBottom: '6px' }}>
                                                                Over remaining budget for this step.
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                if (overBudget) return;
                                                                handleHotelSelect(hotel);
                                                                setShowCompareModal(false);
                                                            }}
                                                            disabled={overBudget}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                background: overBudget ? '#ccc' : '#4CAF50',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: overBudget ? 'not-allowed' : 'pointer',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.9rem'
                                                            }}
                                                        >
                                                            {overBudget ? "Over Budget" : "Choose this Hotel"}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
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
                            <input
                                name="startDate"
                                type="date"
                                min={getTodayDateString()}
                                value={formData.startDate}
                                onChange={handleInputChange}
                                style={dateErrors.startDate ? { borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" } : undefined}
                            />
                            {dateErrors.startDate && <small style={{ color: "#fecaca", fontWeight: 700 }}>{dateErrors.startDate}</small>}
                        </div>
                        <div className="field">
                            <label>Return</label>
                            <input
                                name="endDate"
                                type="date"
                                min={formData.startDate || getTodayDateString()}
                                value={formData.endDate}
                                onChange={handleInputChange}
                                style={dateErrors.endDate ? { borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" } : undefined}
                            />
                            {dateErrors.endDate && <small style={{ color: "#fecaca", fontWeight: 700 }}>{dateErrors.endDate}</small>}
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

                <section className="companions-board">
                    <div className="companions-board-header">
                        <h3>Travel Companions</h3>
                        <p>See trips that are open for outsiders to join and split costs.</p>
                    </div>
                    {collaborationPosts.length === 0 ? (
                        <p className="companions-empty">No open collaboration trips yet. Publish one from Step 4 summary.</p>
                    ) : (
                        <div className="companions-list">
                            {collaborationPosts.map((post) => {
                                return (
                                    <article className="companions-card" key={post.id}>
                                        <div className="companions-top">
                                            <strong>{post.origin ? `${post.origin} to ${post.destination}` : post.destination}</strong>
                                            <span>{post.startDate} to {post.endDate}</span>
                                        </div>
                                        <p className="companions-meta">
                                            Host: {post.hostName} | Seats open: {post.seatsAvailable}
                                        </p>
                                        <p className="companions-meta">
                                            Total cost: Rs.{post.totalCost} | Approx per person: Rs.{getCostPerPerson(post.totalCost, post.seatsAvailable)}
                                        </p>
                                        {post.note && <p className="companions-note">{post.note}</p>}
                                        <div className="companions-actions">
                                            <button className="request-btn" onClick={() => handleRequestToJoin(post)}>
                                                Request to Join
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {error && <div className="msg-box error">{error}</div>}
                {info && <div className="msg-box info">{info}</div>}
                {popupMessage && <div className="date-popup">{popupMessage}</div>}

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
                                <section className="results-column" style={sectionStyle}>
                                    <h3 className="section-title">✈️ Step 1: Select Flight</h3>
                                    {trip.flights.filter(isFutureFlight).map((f, i) => (
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
                                                    <strong>{getTimeText(f.departureTime)}</strong>
                                                    <span>{f.departureAirport}</span>
                                                </div>
                                                <div className="route-line">✈️</div>
                                                <div className="route-point">
                                                    <strong>{getTimeText(f.arrivalTime)}</strong>
                                                    <span>{f.arrivalAirport}</span>
                                                </div>
                                            </div>
                                            <div className="flight-footer" style={flightFooterStyle}>
                                                <span className="price" style={{ fontWeight: 'bold', color: '#333' }}>
                                                    {f.price}
                                                </span>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <label style={compareLabelStyle}>
                                                        <input
                                                            type="checkbox"
                                                            checked={compareList.some(c => c.type === 'flight' && c.flightNumber === f.flightNumber)}
                                                            onChange={() => addToCompare(f, 'flight')}
                                                        />
                                                        Compare
                                                    </label>
                                                    <button
                                                        className="select-btn"
                                                        onClick={() => handleFlightSelect(f)}
                                                        style={primaryFlightBtnStyle}
                                                    >
                                                        Select Flight & Continue
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Step 2: Hotels */}
                            {step === 2 && (
                                <section className="results-column" style={sectionStyle}>
                                    <button
                                        onClick={() => setStep(1)}
                                        style={backBtnStyle}
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
                                                    src={(h.photoUrls && h.photoUrls.length > 0 ? h.photoUrls[0] : h.photoUrl) || `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=60`}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                <p className="addr" style={{ margin: 0 }}>📍 {h.address}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = buildMapsUrl(h);
                                                        if(url) window.open(url, '_blank');
                                                    }}
                                                    style={{
                                                        background: '#E1F5FE',
                                                        border: '1px solid #81D4FA',
                                                        color: '#0277BD',
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        padding: '4px 12px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    📍 Location
                                                </button>
                                            </div>
                                            <div className="hotel-footer">
                                                <span className="rating">⭐ {h.rating}</span>
                                                <div className="pricing">
                                                    <span className="price" style={{ fontSize: '1.4rem' }}>₹{h.price * calculateNights()}</span>
                                                    <span className="total">for {calculateNights()} nights</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                                <label style={compareLabelStyle}>
                                                    <input
                                                        type="checkbox"
                                                        checked={compareList.some(c => c.type === 'hotel' && c.name === h.name)}
                                                        onChange={() => addToCompare(h, 'hotel')}
                                                    />
                                                    Compare
                                                </label>
                                                <button
                                                    className="select-btn"
                                                    onClick={() => handleHotelSelect(h)}
                                                    style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Select Hotel & Continue
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* Step 3: Return Flight */}
                            {step === 3 && (
                                <section className="results-column" style={sectionStyle}>
                                    <button
                                        onClick={() => setStep(2)}
                                        style={backBtnStyle}
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

                                    {returnFlights.filter(isFutureFlight).map((f, i) => (
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
                                                    <strong>{getTimeText(f.departureTime)}</strong>
                                                    <span>{f.departureAirport}</span>
                                                </div>
                                                <div className="route-line">✈️</div>
                                                <div className="route-point">
                                                    <strong>{getTimeText(f.arrivalTime)}</strong>
                                                    <span>{f.arrivalAirport}</span>
                                                </div>
                                            </div>
                                            <div className="flight-footer" style={flightFooterStyle}>
                                                <span className="price" style={{ fontWeight: 'bold', color: '#333' }}>
                                                    {f.price}
                                                </span>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <label style={compareLabelStyle}>
                                                        <input
                                                            type="checkbox"
                                                            checked={compareList.some(c => c.type === 'flight' && c.flightNumber === f.flightNumber)}
                                                            onChange={() => addToCompare(f, 'flight')}
                                                        />
                                                        Compare
                                                    </label>
                                                    <button
                                                        className="select-btn"
                                                        onClick={() => handleReturnFlightSelect(f)}
                                                        style={primaryFlightBtnStyle}
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
                                <section className="results-column" style={sectionStyle}>
                                    <button
                                        onClick={() => setStep(3)}
                                        style={backBtnStyle}
                                    >
                                        ← Back to Return Flight
                                    </button>
                                    <h3 className="section-title">🧾 Step 4: Trip Summary & Pricing</h3>
                                    <div className="trip-card" style={{ padding: '20px' }}>
                                        <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Departure Flight</h4>
                                        <div style={{ margin: '10px 0' }}>
                                            <p><strong>Airline:</strong> {selectedFlight.airline} ({selectedFlight.flightNumber})</p>
                                            <p><strong>Route:</strong> {selectedFlight.departureAirport} ➝ {selectedFlight.arrivalAirport}</p>
                                            <p><strong>Time:</strong> {getTimeText(selectedFlight.departureTime)} - {getTimeText(selectedFlight.arrivalTime)}</p>
                                            <p><strong>Price:</strong> {selectedFlight.price}</p>
                                        </div>

                                        {selectedReturnFlight && (
                                            <>
                                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}>Return Flight</h4>
                                                <div style={{ margin: '10px 0' }}>
                                                    <p><strong>Airline:</strong> {selectedReturnFlight.airline} ({selectedReturnFlight.flightNumber})</p>
                                                    <p><strong>Route:</strong> {selectedReturnFlight.departureAirport} ➝ {selectedReturnFlight.arrivalAirport}</p>
                                                    <p><strong>Time:</strong> {getTimeText(selectedReturnFlight.departureTime)} - {getTimeText(selectedReturnFlight.arrivalTime)}</p>
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

                                        <div className="collab-panel">
                                            <h4>Open This Trip For Companions</h4>
                                            <p>Publish this trip so others can request to join and share expenses.</p>
                                            <div className="collab-grid">
                                                <input
                                                    type="text"
                                                    placeholder="Your name"
                                                    value={collabForm.hostName}
                                                    onChange={(e) => setCollabForm({ ...collabForm, hostName: e.target.value })}
                                                />
                                                <input
                                                    type="email"
                                                    placeholder="Your account email"
                                                    value={userEmail || collabForm.hostEmail}
                                                    readOnly
                                                    title="Requests are matched to your logged-in account email"
                                                />
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    placeholder="Seats available"
                                                    value={collabForm.seatsAvailable}
                                                    onChange={(e) => setCollabForm({ ...collabForm, seatsAvailable: e.target.value })}
                                                />
                                            </div>
                                            <textarea
                                                placeholder="Optional note: vibe, preferences, safety expectations..."
                                                value={collabForm.note}
                                                onChange={(e) => setCollabForm({ ...collabForm, note: e.target.value })}
                                            />
                                            <p className="collab-cost">
                                                Estimated split: Rs.{getCostPerPerson(getTotalCost(), collabForm.seatsAvailable)} per person
                                            </p>
                                            <button type="button" className="publish-btn" onClick={handlePublishCollaboration}>
                                                Publish Open-to-Join Trip
                                            </button>
                                            {collabMessage && <p className="collab-message">{collabMessage}</p>}
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
        </div>
    );
}

export default Trips;
