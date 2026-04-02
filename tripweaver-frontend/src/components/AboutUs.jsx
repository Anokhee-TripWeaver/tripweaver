import React from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Map, Users, Star, Mail, Globe } from "lucide-react";

export default function AboutUs() {
  const navigate = useNavigate();

  const features = [
    { icon: "✈️", title: "Smart Trip Planning", desc: "AI-powered itinerary generation tailored to your preferences and budget." },
    { icon: "🤝", title: "Open Trips", desc: "Join other travellers and split costs for shared adventures." },
    { icon: "🏨", title: "Hotels & Flights", desc: "Search and compare the best deals all in one place." },
    { icon: "🤖", title: "AI Travel Agent", desc: "Chat with our AI to plan, book, and get travel advice instantly." },
    { icon: "📋", title: "Packing Checklist", desc: "Never forget essentials with auto-generated packing lists." },
    { icon: "💰", title: "Expense Splitting", desc: "Easily split trip costs among your travel group." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "Arial, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#f97316,#ec4899)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20 }}>✈️</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700 }}>TripWeaver</span>
        </div>
        <button onClick={() => navigate("/")} style={{ background: "linear-gradient(135deg,#f97316,#ec4899)", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontWeight: 600 }}>
          Back to Home
        </button>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "80px 20px 60px" }}>
        <div style={{ display: "inline-block", background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 20, padding: "6px 16px", marginBottom: 20, fontSize: 14, color: "#f97316" }}>
          About TripWeaver
        </div>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800, marginBottom: 20, background: "linear-gradient(135deg,#fff,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Your Smart Travel Companion
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
          TripWeaver is a full-stack travel planning platform built to make trip planning effortless, collaborative, and intelligent — powered by AI.
        </p>
      </div>

      {/* Mission */}
      <div style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 20px" }}>
        <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.1),rgba(236,72,153,0.1))", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 20, padding: "40px" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 16, color: "#f97316" }}>Our Mission</h2>
          <p style={{ color: "#cbd5e1", lineHeight: 1.8, fontSize: "1.05rem" }}>
            We believe travel should be accessible, affordable, and stress-free. TripWeaver brings together flight search, hotel booking, AI itinerary planning, collaborative trip sharing, and expense splitting — all under one roof. Whether you're a solo traveller or planning a group adventure, TripWeaver has you covered.
          </p>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 20px" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: 700, marginBottom: 40 }}>What We Offer</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: "#1e293b", borderRadius: 16, padding: "28px 24px", border: "1px solid #334155", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8, color: "#f1f5f9" }}>{f.title}</h3>
              <p style={{ color: "#94a3b8", lineHeight: 1.6, fontSize: "0.95rem" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div style={{ textAlign: "center", padding: "0 20px 80px" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 12 }}>Get in Touch</h2>
        <p style={{ color: "#94a3b8", marginBottom: 20 }}>Have questions or feedback? We'd love to hear from you.</p>
        <a href="mailto:tripweaverofficial@gmail.com" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#f97316,#ec4899)", color: "#fff", padding: "12px 28px", borderRadius: 25, textDecoration: "none", fontWeight: 600, fontSize: "1rem" }}>
          📧 tripweaverofficial@gmail.com
        </a>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "24px 40px", textAlign: "center", color: "#475569", fontSize: "0.9rem" }}>
        © 2026 TripWeaver. All rights reserved.
      </div>
    </div>
  );
}
