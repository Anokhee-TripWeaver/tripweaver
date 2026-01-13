import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";

export default function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);

    useEffect(() => {
        const items = JSON.parse(localStorage.getItem("cart") || "[]");
        setCartItems(items);
    }, []);

    const removeFromCart = (id) => {
        const updatedCart = cartItems.filter(item => item.id !== id);
        setCartItems(updatedCart);
        localStorage.setItem("cart", JSON.stringify(updatedCart));
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem("cart");
    };

    const handleCheckout = () => {
        alert("Proceeding to payment gateway... (Mock)");
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3c72, #2a5298)', paddingBottom: '40px' }}>
            <Navbar />
            <div style={{ maxWidth: '1000px', margin: '100px auto 0', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '15px' }}>
                    <h2 style={{ color: 'white', margin: 0 }}>🛒 My Cart</h2>
                    {cartItems.length > 0 && (
                        <button onClick={clearCart} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                            Clear Cart
                        </button>
                    )}
                </div>

                {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginTop: '50px' }}>
                        <h3>Your cart is empty.</h3>
                        <button onClick={() => navigate('/trips')} style={{ marginTop: '20px', padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Start Planning
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {cartItems.map((item) => (
                            <div key={item.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                                <div style={{ flex: 2, minWidth: '300px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#2196F3' }}>Trip to {item.destination}</h3>
                                    <p style={{ color: '#666', margin: '5px 0' }}>📅 {item.startDate} to {item.endDate} ({item.nights} Nights)</p>
                                    
                                    <div style={{ marginTop: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                                        <p style={{ margin: '5px 0' }}><strong>✈️ Flight:</strong> {item.flight?.airline} ({item.flight?.flightNumber})</p>
                                        {item.returnFlight && (
                                            <p style={{ margin: '5px 0' }}><strong>✈️ Return:</strong> {item.returnFlight?.airline} ({item.returnFlight?.flightNumber})</p>
                                        )}
                                        <p style={{ margin: '5px 0' }}><strong>🏨 Hotel:</strong> {item.hotel?.name}</p>
                                    </div>
                                </div>

                                <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ display: 'block', fontSize: '0.9rem', color: '#888' }}>Total Cost</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>₹{item.totalCost}</span>
                                    </div>
                                    
                                    <button onClick={() => removeFromCart(item.id)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <span style={{ fontSize: '1.2rem' }}>Grand Total:</span>
                                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                    ₹{cartItems.reduce((sum, item) => sum + item.totalCost, 0)}
                                </span>
                            </div>
                            <button onClick={handleCheckout} style={{ width: '100%', padding: '15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
