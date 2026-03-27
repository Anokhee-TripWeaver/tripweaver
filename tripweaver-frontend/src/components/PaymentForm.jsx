import {
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements
} from "@stripe/react-stripe-js";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PaymentForm.css";
import API_BASE from "../config";
import CustomModal from "./CustomModal";

const PaymentForm = ({ bookingData }) => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [zip, setZip] = useState("");
    const [showModal, setShowModal] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setError("");

        try {
            console.log("Creating payment intent for amount:", bookingData.totalCost);
            
            // Create PaymentIntent
            const res = await axios.post(`${API_BASE}/payments/create-intent`, 
                { amount: bookingData.totalCost }
            );
            
            console.log("Payment intent created:", res.data);
            const clientSecret = res.data.clientSecret;

            console.log("Confirming card payment...");
            
            // Confirm payment (include ZIP)
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardNumberElement),
                    billing_details: {
                        address: {
                            postal_code: zip,
                        },
                    },
                },
            });

            console.log("Payment result:", result);

            if (result.error) {
                console.error("Payment error:", result.error);
                setError(result.error.message);
                setLoading(false);
                return;
            }

            // Success
            if (result.paymentIntent.status === "succeeded") {
                console.log("Payment succeeded! Creating bookings...");
                
                if (bookingData.isCollab) {
                    // Handle collaboration booking
                    await axios.post(`${API_BASE}/collaboration-trips/${bookingData.tripId}/bookings`, {
                        bookedByEmail: bookingData.bookedByEmail,
                        bookedByName: bookingData.bookedByName,
                        travellerEmails: bookingData.travellerEmails,
                        travellerNames: bookingData.travellerNames,
                        totalTravellers: bookingData.totalTravellers,
                        totalCost: bookingData.totalCost,
                        bookingReference: `COLLAB-${result.paymentIntent.id.substring(3, 11).toUpperCase()}`
                    }, { withCredentials: true });
                } else {
                    // Process normal cart bookings
                    const bookingPromises = bookingData.items.map(item => {
                        const booking = {
                            destination: item.destination,
                            startDate: item.startDate,
                            endDate: item.endDate,
                            totalCost: item.totalCost,
                            flightDetails: item.flight ? JSON.stringify(item.flight) : null,
                            returnFlightDetails: item.returnFlight ? JSON.stringify(item.returnFlight) : null,
                            hotelDetails: item.hotel ? JSON.stringify(item.hotel) : null,
                            username: bookingData.username,
                            paymentId: result.paymentIntent.id,
                            paymentStatus: "SUCCESS"
                        };
                        return axios.post(`${API_BASE}/bookings/create`, booking, { withCredentials: true });
                    });
                    await Promise.all(bookingPromises);
                }
                
                console.log("All bookings created successfully!");

                // Clear cart after successful booking (only for normal cart flow)
                if (!bookingData.isCollab) {
                    const username = sessionStorage.getItem("username");
                    const cartKey = username ? `cart-${username}` : "cart";
                    localStorage.removeItem(cartKey);
                }

                // Show success modal
                setSuccess(true);
                setShowModal(true);
                setError("");
                setLoading(false);
            }
        } catch (err) {
            console.error("Payment failed:", err);
            console.error("Error details:", err.response?.data);
            setError(err.response?.data?.message || "Payment failed. Please try again.");
        }
        setLoading(false);
    };

    const elementStyle = {
        style: {
            base: {
                fontSize: "15px",
                color: "#1e293b",
                "::placeholder": { color: "#94a3b8" },
            },
        },
    };

    return (
        <form className="payment-form" onSubmit={handleSubmit}>
            {/* Stripe header */}
            <div className="stripe-header">
                <img
                    src="https://stripe.com/img/v3/home/twitter.png"
                    alt="Stripe"
                />
                <span>Secure payment with Stripe</span>
            </div>

            {/* Test Mode */}
            <div className="test-mode-box">
                <p className="test-title">🔒 Test Mode – Use these card details</p>
                <ul>
                    <li><strong>Card:</strong> 4242 4242 4242 4242</li>
                    <li><strong>MM / YY:</strong> 12 / 34</li>
                    <li><strong>CVC:</strong> 123</li>
                    <li><strong>ZIP:</strong> 12345</li>
                </ul>
            </div>

            {/* Card Number */}
            <div className="card-row">
                <div className="card-field">
                    <label>Card Number</label>
                    <CardNumberElement options={elementStyle} />
                </div>
            </div>

            {/* Expiry + CVC */}
            <div className="card-row">
                <div className="card-field">
                    <label>MM / YY</label>
                    <CardExpiryElement options={elementStyle} />
                </div>
                <div className="card-field">
                    <label>CVC</label>
                    <CardCvcElement options={elementStyle} />
                </div>
            </div>

            {/* ZIP */}
            <div className="card-row">
                <div className="card-field">
                    <label>ZIP / Postal Code</label>
                    <input
                        type="text"
                        placeholder="12345"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        required
                        className="zip-input"
                    />
                </div>
            </div>

            {error && <p className="payment-error">{error}</p>}

            <button className="pay-button" disabled={!stripe || loading || success}>
                {loading ? "Processing..." : success ? "Payment Complete ✓" : `Pay ₹${bookingData.totalCost}`}
            </button>
            
            {/* Success Modal */}
            <CustomModal
                show={showModal}
                title="Payment Successful!"
                message="Your booking has been confirmed. Redirecting to bookings page..."
                type="success"
                onClose={() => {
                    setShowModal(false);
                    navigate("/bookings");
                }}
            />
        </form>
    );
};

export default PaymentForm;
