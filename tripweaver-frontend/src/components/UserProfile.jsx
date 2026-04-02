import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Calendar, MapPin, CheckCircle, XCircle, Clock, DollarSign, Users } from "lucide-react";
import "./UserProfile.css";
import Navbar from "./navbar";
import API_BASE from "../config";
import { getJoinRequestsForHost, getJoinRequestsForRequester, updateJoinRequestStatus } from "../utils/collaboration";

axios.defaults.withCredentials = true;

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myRequests, setRequesterRequests] = useState([]);
  const [activeSplitId, setActiveSplitId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", splitType: "EQUAL", allocations: {} });
  const [tripMembers, setTripMembers] = useState({});
  const [settlements, setSettlements] = useState({});
  const [bookings, setBookings] = useState({});
  const [showBookingModal, setShowBookingModal] = useState(null);
  const [tripDetails, setTripDetails] = useState({});
  const [selectedTravellers, setSelectedTravellers] = useState([]);
  const [bookingCost, setBookingCost] = useState("");
  const [resolvedPricePerPerson, setResolvedPricePerPerson] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);
  const navigate = useNavigate();

  // Group Ongoing Trips by postId to avoid duplicate blocks for the same trip
  // HOOK MUST BE AT TOP LEVEL BEFORE ANY EARLY RETURNS
  const groupedOngoing = useMemo(() => {
    const allAccepted = [
      ...incomingRequests.filter(r => r.status === "ACCEPTED"),
      ...myRequests.filter(r => r.status === "ACCEPTED")
    ];
    
    const groups = {};
    allAccepted.forEach(req => {
      const key = req.postId;
      if (!groups[key]) {
        groups[key] = {
          postId: key,
          destination: req.destination,
          startDate: req.startDate,
          endDate: req.endDate,
          hostEmail: req.hostEmail,
          hostName: req.hostName,
          pricePerPerson: req.pricePerPerson,
          members: []
        };
      }
      // Add member info
      groups[key].members.push({ name: req.requesterName, email: req.requesterEmail });
    });
    return Object.values(groups);
  }, [incomingRequests, myRequests]);

  const showToast = (message, type = "info", duration = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    // 1. Always try to fetch from /api/profile which checks session/cookie
    axios
      .get(`${API_BASE}/profile`)
      .then(res => {
        if (res.data && res.data.loggedIn) {
          setProfile(res.data);
          // Sync with session storage
          sessionStorage.setItem("email", res.data.email);
          sessionStorage.setItem("username", res.data.name);
          localStorage.setItem("username", res.data.name);
        } else {
          // 2. Fallback to session storage if backend session is missing but frontend thinks we're logged in
          const storedEmail = sessionStorage.getItem("email");
          const storedUsername = sessionStorage.getItem("username");

          if (storedEmail && storedUsername) {
            setProfile({
              loggedIn: true,
              name: storedUsername,
              email: storedEmail,
              history: []
            });
          } else {
            setProfile(null);
          }
        }
      })
      .catch(() => {
        // Handle error by checking session storage
        const storedEmail = sessionStorage.getItem("email");
        const storedUsername = sessionStorage.getItem("username");

        if (storedEmail && storedUsername) {
          setProfile({
            loggedIn: true,
            name: storedUsername,
            email: storedEmail,
            history: []
          });
        } else {
          setProfile(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.email) {
      // Load from backend if possible, fallback to local
      const loadRequests = async () => {
        try {
          const hostRes = await axios.get(`${API_BASE}/collaboration-trips/join-requests/host`, { params: { email: profile.email } });
          setIncomingRequests(hostRes.data || []);
          
          const reqRes = await axios.get(`${API_BASE}/collaboration-trips/join-requests/requester`, { params: { email: profile.email } });
          setRequesterRequests(reqRes.data || []);
        } catch (e) {
          setIncomingRequests(getJoinRequestsForHost(profile.email));
          setRequesterRequests(getJoinRequestsForRequester(profile.email));
        }
      };
      loadRequests();
    }
  }, [profile]);

  // Pre-load trip data (members, bookings) for all ongoing trips so buttons reflect state correctly
  useEffect(() => {
    if (groupedOngoing.length > 0) {
      groupedOngoing.forEach(trip => {
        if (!tripDetails[trip.postId]) {
          loadSettlements(trip.postId);
        }
      });
    }
  }, [groupedOngoing]);

  useEffect(() => {
    if (showBookingModal) {
      const trip = groupedOngoing.find(t => t.postId === showBookingModal);
      const details = tripDetails[showBookingModal];

      // Use the resolved price (set when Book Ticket was clicked), fallback to calculated
      const ppp = resolvedPricePerPerson[showBookingModal]
        || (details?.pricePerPerson && details.pricePerPerson > 0 ? details.pricePerPerson : 0)
        || (details?.totalCost && details?.seatsAvailable != null ? details.totalCost / (details.seatsAvailable + 1) : 0)
        || (trip?.pricePerPerson && trip.pricePerPerson > 0 ? trip.pricePerPerson : 0);

      if (ppp > 0) {
        setBookingCost((ppp * selectedTravellers.length).toFixed(2));
      }
    } else {
      setBookingCost("");
    }
  }, [selectedTravellers, showBookingModal, groupedOngoing, tripDetails, resolvedPricePerPerson]);

  const handleUpdateStatus = async (id, status) => {
    // 1. Update UI immediately for responsiveness
    setIncomingRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    updateJoinRequestStatus(id, status);

    try {
      // 2. Call backend to update status
      await axios.patch(`${API_BASE}/collaboration-trips/join-requests/${id}/status`, null, { params: { status } });
      
      // 3. Handle acceptance flow (seats decrement)
      if (status === "ACCEPTED") {
        const req = incomingRequests.find(r => r.id === id);
        if (req) {
          showToast(`Accepted ${req.requesterName}'s request!`, "success");
          
          // Decrement seat (non-blocking for UI)
          if (req.postId) {
            axios.post(`${API_BASE}/collaboration-trips/${req.postId}/accept-seat`)
              .catch(err => console.error("Seat decrement failed", err));
          }
        }
      } else {
        showToast(`Request ${status.toLowerCase()}`, "info");
      }
    } catch (e) {
      console.error("Failed to update status on server", e);
      showToast("Failed to update status. Please refresh.", "error");
    }
  };

  const loadSettlements = async (tripId) => {
    if (!tripId) return;
    try {
      const [settlementsRes, membersRes, bookingsRes, tripRes] = await Promise.all([
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/settlements`),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/members`),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}/bookings`),
        axios.get(`${API_BASE}/collaboration-trips/${tripId}`)
      ]);

      // Also fetch individual expenses
      let expensesList = [];
      try {
        const expRes = await axios.get(`${API_BASE}/collaboration-trips/${tripId}/expenses`);
        expensesList = expRes.data || [];
      } catch (e) {}

      setSettlements(prev => ({ ...prev, [tripId]: { ...settlementsRes.data, expenses: expensesList } }));
      setTripMembers(prev => ({ ...prev, [tripId]: membersRes.data || [] }));
      setBookings(prev => ({ ...prev, [tripId]: bookingsRes.data || [] }));
      setTripDetails(prev => ({ ...prev, [tripId]: tripRes.data }));

      // Return the trip data so callers can use it immediately
      return tripRes.data;
    } catch (e) {
      // Fallback: If backend fails, use members from the grouped trip info
      const trip = groupedOngoing.find(t => t.postId === tripId);
      if (trip) {
        const fallbackMembers = [
          { name: trip.hostName || "Host", email: trip.hostEmail },
          ...trip.members
        ];
        // Deduplicate
        const unique = Array.from(new Set(fallbackMembers.map(m => m.email)))
          .map(email => fallbackMembers.find(m => m.email === email));
          
        setTripMembers(prev => ({ ...prev, [tripId]: unique }));
      }
    }
  };

  const handleCreateBooking = async (tripId) => {
    if (selectedTravellers.length === 0) {
      showToast("Please select at least one traveller.", "warning");
      return;
    }
    if (!bookingCost || parseFloat(bookingCost) <= 0) {
      showToast("Please enter a valid total cost.", "warning");
      return;
    }

    const travellers = tripMembers[tripId].filter(m => selectedTravellers.includes(m.email));
    const payload = {
      tripId: tripId,
      bookedByEmail: profile.email,
      bookedByName: profile.name,
      travellerEmails: travellers.map(t => t.email),
      travellerNames: travellers.map(t => t.name),
      totalTravellers: travellers.length,
      totalCost: parseFloat(bookingCost),
      // Flag this as a collaboration booking for the payment page
      isCollab: true,
      items: [{ destination: groupedOngoing.find(t => t.postId === tripId)?.destination || "Trip" }]
    };

    // Redirect to payment page with the booking data
    navigate("/payment", { state: { bookingData: payload } });
  };

  const toggleTraveller = (email) => {
    setSelectedTravellers(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAddExpense = async (tripId) => {
    if (!tripId) {
      showToast("Trip ID is missing. Cannot add expense.", "error");
      return;
    }
    if (!expenseForm.description || !expenseForm.amount) {
      showToast("Please enter both description and amount.", "warning");
      return;
    }
    
    if (expenseForm.splitType === "CUSTOM") {
      const total = parseFloat(expenseForm.amount);
      const sum = Object.values(expenseForm.allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(sum - total) > 0.01) {
        showToast(`Sum (₹${sum.toFixed(2)}) must equal total (₹${total.toFixed(2)})`, "warning");
        return;
      }
    }

    try {
      await axios.post(`${API_BASE}/collaboration-trips/${tripId}/expenses`, {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        paidByEmail: profile.email,
        paidByName: profile.name,
        splitType: expenseForm.splitType,
        allocations: expenseForm.allocations,
        splitBetweenEmails: tripMembers[tripId]?.map(m => m.email) || []
      });
      setExpenseForm({ description: "", amount: "", splitType: "EQUAL", allocations: {} });
      loadSettlements(tripId);
      showToast("Expense added successfully!", "success");
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.message || "Failed to add expense";
      if (errorMsg.includes("Trip not found")) {
        showToast("Collaboration trip no longer exists.", "error");
      } else {
        showToast(errorMsg, "error");
      }
    }
  };

  const handleHistoryClick = (h) => {
    if (h.type === "DESTINATION") {
      navigate(`/search?query=${encodeURIComponent(h.destination || h.query)}`);
    } else if (h.type === "TRIP") {
      navigate("/trips", { state: { restore: h } });
    } else if (h.type === "ITINERARY") {
      navigate("/planner", { state: { restore: h } });
    }
  };

  if (loading) return <p style={{ color: "black", textAlign: "center", marginTop: "100px" }}>Loading profile...</p>;
  if (!profile || profile.loggedIn === false) return (
    <div style={{ color: "black", textAlign: "center", marginTop: "150px" }}>
        <h2>Please login to view your profile</h2>
        <button onClick={() => navigate("/signup")} style={{ marginTop: "20px", padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Go to Login
        </button>
    </div>
  );

  const history = profile.history || [];
  
  const pendingIncoming = incomingRequests.filter(r => r.status === "PENDING");
  const otherMyRequests = myRequests.filter(r => r.status !== "ACCEPTED");

  return (
    <div className="profile-page">
      <Navbar />
      
      {/* Toast Notification */}
      {toast && (
        <div className={`custom-toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="profile-container">
        <div className="profile-content">

          {/* LEFT → TRAVELLER PROFILE */}
          <aside className="profile-card">
            <div className="avatar">
              <img
                src={profile.picture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="profile"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3>{profile.name}</h3>
            <p><Mail size={14} style={{ marginRight: '5px' }} /> {profile.email}</p>
            <span className="role-badge">Explorer</span>
          </aside>

          {/* RIGHT → MAIN CONTENT */}
          <main className="main-sections">
            
            {/* 🏙️ TRAVEL HISTORY */}
            <div className="history-section">
              <h3><Clock size={20} /> Travel Search History</h3>
              {history.length === 0 ? (
                <p className="empty-msg">No journeys explored yet. Start searching!</p>
              ) : (
                <div className="history-list">
                  {history.map((h, i) => (
                    <div 
                      key={i} 
                      className="history-item" 
                      onClick={() => handleHistoryClick(h)}
                      title="Click to view details"
                    >
                      <div className="history-details">
                        <h4>{h.query}</h4>
                        <p>
                          {h.type === "DESTINATION" && <MapPin size={14} />}
                          {h.type === "TRIP" && "✈️"}
                          {h.type === "ITINERARY" && <Calendar size={14} />}
                          {" "} {h.category || h.type}
                        </p>
                        <small>{new Date(h.searchedAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🌟 ONGOING TRIPS (ACCEPTED COLLABORATIONS) */}
            <div className="collab-section">
              <h3><Users size={20} /> Ongoing Trips</h3>
              {groupedOngoing.length === 0 ? (
                <p className="empty-msg">No ongoing trips yet. Accept a request or join one to start splitting costs!</p>
              ) : (
                <div className="requests-list">
                  {groupedOngoing.map((trip) => (
                    <div key={trip.postId} className="ongoing-trip-container" style={{ marginBottom: '20px' }}>
                      <div className="request-item">
                        <div className="request-details">
                          <h4>
                            Trip to {trip.destination} 
                            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                              Host: {trip.hostName} • {trip.members.length + 1} Members
                            </span>
                          </h4>
                          <p><Calendar size={14} /> {trip.startDate} - {trip.endDate}</p>
                          <span className="status-badge status-accepted">
                            <CheckCircle size={12} /> ONGOING
                          </span>
                        </div>
                          <div className="action-buttons">
                            {(() => {
                              const bookedEmails = (bookings[trip.postId] || []).flatMap(b => b.travellerEmails);
                              const tripMems = tripMembers[trip.postId] || [];
                              const isEveryoneBooked = tripMems.length > 0 && tripMems.every(m => bookedEmails.includes(m.email));
                              
                              return (
                                <button 
                                  className="add-expense-btn"
                                  disabled={!isEveryoneBooked}
                                  title={!isEveryoneBooked ? "Booking for all members required before splitting" : ""}
                                  onClick={() => {
                                    setActiveSplitId(activeSplitId === trip.postId ? null : trip.postId);
                                    if (activeSplitId !== trip.postId) loadSettlements(trip.postId);
                                  }}
                                >
                                  {activeSplitId === trip.postId ? "Hide Split" : <><DollarSign size={14} /> Manage Split</>}
                                </button>
                              );
                            })()}
                            <button 
                              className="accept-btn"
                              onClick={async () => {
                                setShowBookingModal(trip.postId);
                                const bookedEmails = (bookings[trip.postId] || []).flatMap(b => b.travellerEmails);
                                const initialTravellers = profile?.email && !bookedEmails.includes(profile.email)
                                  ? [profile.email]
                                  : [];
                                setSelectedTravellers(initialTravellers);

                                // Step 1: try fetching by postId
                                const fetchedTrip = await loadSettlements(trip.postId);
                                let src = fetchedTrip;

                                // Step 2: if price still 0/null, use /lookup by destination+dates+host
                                if (!src || !src.pricePerPerson || src.pricePerPerson <= 0) {
                                  try {
                                    const lookupRes = await axios.get(`${API_BASE}/collaboration-trips/lookup`, {
                                      params: {
                                        hostEmail: trip.hostEmail,
                                        destination: trip.destination,
                                        startDate: trip.startDate,
                                        endDate: trip.endDate
                                      },
                                      withCredentials: true
                                    });
                                    if (lookupRes.data) src = lookupRes.data;
                                  } catch (e) {}
                                }

                                // Step 3: calculate ppp from whatever we have
                                const ppp = (src?.pricePerPerson && src.pricePerPerson > 0)
                                  ? src.pricePerPerson
                                  : (src?.totalCost && src.totalCost > 0 && src?.seatsAvailable != null)
                                    ? src.totalCost / (src.seatsAvailable + 1)
                                    : 0;

                                setResolvedPricePerPerson(prev => ({ ...prev, [trip.postId]: ppp }));

                                if (ppp > 0 && initialTravellers.length > 0) {
                                  setBookingCost((ppp * initialTravellers.length).toFixed(2));
                                } else if (ppp > 0) {
                                  setBookingCost(ppp.toFixed(2));
                                }
                              }}
                            >
                              Book Ticket
                            </button>
                          </div>
                        </div>

                        {/* Booking Modal */}
                        {showBookingModal === trip.postId && (
                          <div className="split-container" style={{ marginTop: '15px', border: '1px solid #10b981' }}>
                            <h5><Calendar size={18} /> Book Tickets for {trip.destination}</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Select Travellers:</label>
                                {(() => {
                                  const bookedEmails = (bookings[trip.postId] || []).flatMap(b => b.travellerEmails);
                                  const availableMembers = (tripMembers[trip.postId] || []).filter(m => !bookedEmails.includes(m.email));
                                  
                                  if (availableMembers.length === 0) return <p style={{ fontSize: '0.85rem', color: '#64748b' }}>All members are already booked!</p>;

                                  return availableMembers.map(member => (
                                    <label key={member.email} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={selectedTravellers.includes(member.email)}
                                        onChange={() => toggleTraveller(member.email)}
                                      />
                                      <span>{member.name} ({member.email === profile.email ? "You" : member.email})</span>
                                    </label>
                                  ));
                                })()}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem' }}>Total Cost (₹):</label>
                                  <input 
                                    type="number" 
                                    placeholder="Calculated automatically"
                                    value={bookingCost}
                                    readOnly
                                    style={{ width: '100%', background: '#f1f5f9', cursor: 'not-allowed' }}
                                  />
                                </div>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                  <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>Travellers: <strong>{selectedTravellers.length}</strong></p>
                                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Cost per person: <strong>₹{
                                    (() => {
                                      const ppp = resolvedPricePerPerson[trip.postId] || 0;
                                      return ppp > 0 ? ppp.toFixed(2) : "0.00";
                                    })()
                                  }</strong></p>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="accept-btn" onClick={() => handleCreateBooking(trip.postId)}>Confirm Booking</button>
                                <button className="reject-btn" onClick={() => setShowBookingModal(null)}>Cancel</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Booking Summary Section */}
                        {bookings[trip.postId]?.length > 0 && (
                          <div className="split-container" style={{ marginTop: '15px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <h5 style={{ color: '#166534' }}><CheckCircle size={18} /> Booking Summary</h5>
                            {bookings[trip.postId].map((b, idx) => (
                              <div key={idx} style={{ marginBottom: '15px', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                  <strong>Ref: {b.bookingReference}</strong>
                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Booked by: {b.bookedByName}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                                  <div>
                                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>Travellers</span>
                                    <strong>{b.totalTravellers}</strong>
                                  </div>
                                  <div>
                                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>Total Cost</span>
                                    <strong>₹{b.totalCost}</strong>
                                  </div>
                                  <div>
                                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>Per Person</span>
                                    <strong>₹{(b.totalCost / b.totalTravellers).toFixed(2)}</strong>
                                  </div>
                                </div>
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0fdf4' }}>
                                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginBottom: '5px' }}>Traveller List:</span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {b.travellerNames.map((name, nIdx) => (
                                      <span key={nIdx} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '99px', fontSize: '0.8rem' }}>{name}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Splitwise UI for ALL members of this trip */}
                      {activeSplitId === trip.postId && (
                        <div className="split-container" style={{ border: '1px solid #6366f1', background: '#f8fafc' }}>
                          <div className="split-header">
                            <h5><DollarSign size={18} /> Shared Expenses for {trip.destination}</h5>
                          </div>
                          <div className="expense-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                              <input 
                                type="text" 
                                placeholder="What was it for?" 
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                              />
                              <input 
                                type="number" 
                                placeholder="Amount (₹)" 
                                value={expenseForm.amount}
                                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                              />
                              <button className="add-expense-btn" onClick={() => handleAddExpense(activeSplitId)}>Add Expense</button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Split Type:</label>
                              <select 
                                value={expenseForm.splitType} 
                                onChange={(e) => setExpenseForm({...expenseForm, splitType: e.target.value})}
                              >
                                <option value="EQUAL">Equally</option>
                                <option value="CUSTOM">Custom / Unequally</option>
                              </select>
                            </div>

                            {expenseForm.splitType === "CUSTOM" && tripMembers[activeSplitId] && (
                              <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <h6 style={{ margin: '0 0 10px 0', fontSize: '0.8rem' }}>Enter individual amounts (must sum to ₹{expenseForm.amount || 0}):</h6>
                                {tripMembers[activeSplitId].map(member => (
                                  <div key={member.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem' }}>{member.name}</span>
                                    <input 
                                      type="number" 
                                      placeholder="₹"
                                      value={expenseForm.allocations[member.email] || ""}
                                      onChange={(e) => setExpenseForm({
                                        ...expenseForm, 
                                        allocations: { ...expenseForm.allocations, [member.email]: e.target.value }
                                      })}
                                      style={{ width: '80px', padding: '4px 8px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {settlements[activeSplitId] && (
                            <div className="settlements-list">
                              {/* Expense Transactions */}
                              {settlements[activeSplitId].expenses?.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                  <h5 style={{ fontSize: '0.9rem', marginBottom: 10, color: '#475569' }}>Expense Transactions:</h5>
                                  {settlements[activeSplitId].expenses.map((exp, idx) => (
                                    <div key={idx} style={{ background: '#fff', padding: '10px 15px', borderRadius: 10, marginBottom: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <strong style={{ fontSize: '0.9rem' }}>{exp.description}</strong>
                                        <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                                          Paid by {exp.paidByName || exp.paidByEmail} · Split {exp.splitType === 'CUSTOM' ? 'custom' : 'equally'}
                                        </span>
                                      </div>
                                      <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '1rem' }}>₹{exp.amount}</span>
                                    </div>
                                  ))}
                                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#475569', marginTop: 4 }}>
                                    Total: <strong>₹{settlements[activeSplitId].totalExpenses || 0}</strong>
                                  </div>
                                </div>
                              )}
                              <h5 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#475569' }}>Who Owes What:</h5>
                              {settlements[activeSplitId].settlements?.length === 0 ? (
                                <p style={{ fontSize: '0.85rem' }}>All settled up! Add an expense to see balances.</p>
                              ) : (
                                settlements[activeSplitId].settlements?.map((s, idx) => (
                                  <div key={idx} className="settlement-item" style={{ background: '#fff', padding: '10px 15px', borderRadius: '10px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                                    <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                                    <div style={{ fontSize: '0.9rem' }}>
                                      <strong>{s.fromName || s.fromEmail}</strong> owes <strong>{s.toName || s.toEmail}</strong>: <span style={{ color: '#6366f1', fontWeight: '700' }}>₹{s.amount}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🤝 INCOMING JOIN REQUESTS (PENDING ONLY) */}
            <div className="collab-section">
              <h3><Users size={20} /> Incoming Join Requests</h3>
              {pendingIncoming.length === 0 ? (
                <p className="empty-msg">No pending requests received.</p>
              ) : (
                <div className="requests-list">
                  {pendingIncoming.map((req) => (
                    <div key={req.id} className="request-item">
                      <div className="request-details">
                        <h4>{req.requesterName} wants to join: {req.destination}</h4>
                        <p><Calendar size={14} /> {req.startDate} - {req.endDate}</p>
                        <span className={`status-badge status-${req.status.toLowerCase()}`}>
                          {req.status === "PENDING" && <Clock size={12} />}
                          {" "}{req.status}
                        </span>
                      </div>
                      
                      <div className="action-buttons">
                        <button className="accept-btn" onClick={() => handleUpdateStatus(req.id, "ACCEPTED")}>Accept</button>
                        <button className="reject-btn" onClick={() => handleUpdateStatus(req.id, "REJECTED")}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✈️ MY JOIN REQUESTS (PENDING/REJECTED) */}
            <div className="collab-section">
              <h3><Calendar size={20} /> Trips I've Requested to Join</h3>
              {otherMyRequests.length === 0 ? (
                <p className="empty-msg">No pending or other requests.</p>
              ) : (
                <div className="requests-list">
                  {otherMyRequests.map((req) => (
                    <div key={req.id} className="request-item">
                      <div className="request-details">
                        <h4>Trip to {req.destination} (Host: {req.hostName})</h4>
                        <p><Calendar size={14} /> {req.startDate} - {req.endDate}</p>
                        <span className={`status-badge status-${req.status.toLowerCase()}`}>
                          {req.status === "PENDING" && <Clock size={12} />}
                          {req.status === "REJECTED" && <XCircle size={12} />}
                          {" "}{req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
