import React, { useState, useEffect } from 'react';
import Navbar from './navbar';
import axios from 'axios';
import './UserProfile.css';

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '' });
    const [message, setMessage] = useState('');

    const username = localStorage.getItem('username');

    useEffect(() => {
        if (!username) return;

        // Fetch User Details
        axios.get(`http://localhost:8090/api/user/${username}`)
            .then(res => {
                setUser(res.data);
                setFormData({ username: res.data.username, email: res.data.email });
            })
            .catch(err => console.error(err));

        // Fetch History
        axios.get(`http://localhost:8090/api/user/${username}/history`)
            .then(res => {
                setHistory(res.data);
            })
            .catch(err => console.error(err));
    }, [username]);

    const handleSave = async () => {
        try {
            const res = await axios.put(`http://localhost:8090/api/user/${username}`, formData);
            setUser({ ...user, ...formData });
            setEditMode(false);
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
            
            // If username changed, update localStorage (complex, but let's assume they only change email for now or handle logout)
            if (formData.username !== username) {
                // For simplicity, force logout if username changes
                localStorage.clear();
                window.location.href = '/signup';
            }
        } catch (err) {
            console.error(err);
            setMessage('Failed to update profile.');
        }
    };

    if (!username) return <div className="profile-container">Please log in.</div>;

    return (
        <div className="profile-page">
            <Navbar />
            <div className="profile-container">
                <div className="profile-header">
                    <h2>My Profile</h2>
                    {message && <div className="alert">{message}</div>}
                </div>

                <div className="profile-content">
                    {/* User Details Card */}
                    <div className="profile-card">
                        <div className="avatar-section">
                            <div className="avatar">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <h3>{user?.username}</h3>
                            <span className="role-badge">{user?.role || 'Explorer'}</span>
                        </div>

                        <div className="details-section">
                            {!editMode ? (
                                <>
                                    <div className="detail-item">
                                        <label>Username</label>
                                        <p>{user?.username}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Email</label>
                                        <p>{user?.email}</p>
                                    </div>
                                    <button className="edit-btn" onClick={() => setEditMode(true)}>Edit Profile</button>
                                </>
                            ) : (
                                <div className="edit-form">
                                    <div className="form-group">
                                        <label>Username</label>
                                        <input 
                                            type="text" 
                                            value={formData.username} 
                                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                                            disabled // Disable username edit for now to avoid auth issues
                                            title="Username cannot be changed directly"
                                        />
                                        <small>Username cannot be changed.</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button className="save-btn" onClick={handleSave}>Save</button>
                                        <button className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search History Section */}
                    <div className="history-section">
                        <h3>Past Searches</h3>
                        {history.length === 0 ? (
                            <p className="no-history">No past searches found. Start exploring!</p>
                        ) : (
                            <div className="history-list">
                                {history.map((item) => (
                                    <div key={item.id} className="history-item">
                                        <div className="history-icon">✈️</div>
                                        <div className="history-details">
                                            <h4>{item.origin} ➝ {item.destination}</h4>
                                            <p>{item.travelDate}</p>
                                            <small>{new Date(item.searchTimestamp).toLocaleString()}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
