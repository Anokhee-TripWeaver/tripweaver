import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentForm from "./PaymentForm";
import "./PaymentPage.css";

// Load Stripe with the publishable key
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_51T2XOW6aaT7Cl2RaMu6pQ1ajpnB8lNZUBc1W8zHzbcJvdwlDIQa50wF7kqMgMzgv05G1yWUFkPm6bDbTSWdB3pXp00NZV5JyjY";
const stripePromise = loadStripe(stripePublishableKey);

export default function PaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Booking data coming from Cart
    const bookingData = location.state?.bookingData;

    // Safety check
    if (!bookingData) {
        alert("Invalid payment request");
        navigate("/cart");
        return null;
    }

    return (
        <div className="payment-container">
            <h2>💳 Complete Your Payment</h2>
            <div className="payment-summary">
                <p><strong>Total Amount:</strong> ₹{bookingData.totalCost}</p>
                <p><strong>Number of Trips:</strong> {bookingData.items.length}</p>
            </div>
            <Elements stripe={stripePromise}>
                <PaymentForm
                    bookingData={bookingData}
                    onSuccess={() => navigate("/bookings")}
                />
            </Elements>
        </div>
    );
}
