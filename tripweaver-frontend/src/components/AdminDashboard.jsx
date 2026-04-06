import React, { useEffect, useState } from "react";
import { useNavigate, Routes, Route, NavLink } from "react-router-dom";
import axios from "axios";
import API_BASE from "../config";

function AdminNav({ onLogout }) {
  const linkStyle = ({ isActive }) => ({
    display: "block", padding: "10px 16px", borderRadius: 10, textDecoration: "none",
    color: isActive ? "#fff" : "#94a3b8", background: isActive ? "#6366f1" : "transparent",
    fontWeight: 600, fontSize: "0.9rem", marginBottom: 4, transition: "all 0.2s"
  });
  return (
    <aside style={{ width: 220, background: "#0f172a", minHeight: "100vh", padding: "28px 16px", display: "flex", flexDirection: "column", gap: 4, position: "fixed", top: 0, left: 0 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 28 }}>👑</div>
        <h2 style={{ color: "#fff", margin: "6px 0 2px", fontSize: "1.1rem" }}>Admin Panel</h2>
        <p style={{ color: "#475569", fontSize: "0.78rem", margin: 0 }}>TripWeaver</p>
      </div>
      <NavLink to="/admin/dashboard" end style={linkStyle}>📊 Dashboard</NavLink>
      <NavLink to="/admin/dashboard/users" style={linkStyle}>👤 Users</NavLink>
      <NavLink to="/admin/dashboard/bookings" style={linkStyle}>✈️ Bookings</NavLink>
      <button onClick={onLogout} style={{ marginTop: "auto", padding: "10px 16px", borderRadius: 10, border: "none", background: "#1e293b", color: "#ef4444", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
        Logout
      </button>
    </aside>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: "2rem", color: "#6366f1", fontWeight: 800 }}>{value}</h3>
      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>{label}</p>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState({ users: 0, bookings: 0 });
  useEffect(() => {
    axios.get(`${API_BASE}/admin/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);
  return (
    <div>
      <h2 style={{ margin: "0 0 24px", color: "#0f172a" }}>Dashboard Overview</h2>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <StatCard label="Total Users" value={stats.users} icon="👤" />
        <StatCard label="Total Bookings" value={stats.bookings} icon="✈️" />
      </div>
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => { axios.get(`${API_BASE}/admin/users`).then(r => setUsers(r.data)).catch(() => {}); }, []);
  const deleteUser = async (id) => {
    await axios.delete(`${API_BASE}/admin/users/${id}`);
    setUsers(users.filter(u => u.id !== id));
    setConfirm(null);
  };
  return (
    <div>
      <h2 style={{ margin: "0 0 24px", color: "#0f172a" }}>Users ({users.length})</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem", marginBottom: 12 }}>
              {(u.username || "?").charAt(0).toUpperCase()}
            </div>
            <h4 style={{ margin: "0 0 4px", color: "#0f172a" }}>{u.username}</h4>
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "0.85rem" }}>{u.email}</p>
            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: u.role === "ROLE_ADMIN" ? "#fee2e2" : "#dcfce7", color: u.role === "ROLE_ADMIN" ? "#dc2626" : "#16a34a" }}>{u.role}</span>
            <button onClick={() => setConfirm(u)} style={{ display: "block", marginTop: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>Delete</button>
          </div>
        ))}
      </div>
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", width: 320, textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>Confirm Delete</h3>
            <p style={{ color: "#64748b", margin: "0 0 20px" }}>Remove <strong>{confirm.username}</strong>?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => deleteUser(confirm.id)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Yes, Delete</button>
              <button onClick={() => setConfirm(null)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bookings() {
  const [bookings, setBookings] = useState([]);
  useEffect(() => { axios.get(`${API_BASE}/admin/bookings`).then(r => setBookings(r.data)).catch(() => {}); }, []);
  const statusColor = (s) => {
    const st = (s || "").toLowerCase();
    if (st === "confirmed") return { bg: "#dcfce7", color: "#16a34a" };
    if (st === "cancelled") return { bg: "#fee2e2", color: "#dc2626" };
    return { bg: "#fef3c7", color: "#d97706" };
  };
  return (
    <div>
      <h2 style={{ margin: "0 0 24px", color: "#0f172a" }}>Bookings ({bookings.length})</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {bookings.map(b => {
          const sc = statusColor(b.status);
          return (
            <div key={b.id} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin: "0 0 8px", color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>📍</span> {b.destination}
              </h4>
              <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "0.85rem" }}>User: <strong>{b.username}</strong></p>
              <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: "0.85rem" }}>{b.startDate} → {b.endDate}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: sc.bg, color: sc.color }}>{b.status || "CONFIRMED"}</span>
                {b.totalCost && <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1" }}>₹{b.totalCost}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem("adminAuth")) navigate("/admin");
  }, [navigate]);

  const logout = () => { sessionStorage.removeItem("adminAuth"); navigate("/admin"); };

  return (
    <div style={{ display: "flex", fontFamily: "Inter,sans-serif" }}>
      <AdminNav onLogout={logout} />
      <main style={{ marginLeft: 220, flex: 1, padding: "32px 36px", background: "#f8fafc", minHeight: "100vh" }}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="bookings" element={<Bookings />} />
        </Routes>
      </main>
    </div>
  );
}
