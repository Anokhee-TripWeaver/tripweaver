import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";
import "./Explore.css";

const popularPlaces = [
  { name: "Hyderabad", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2GkubVwmXbxavaUUc6PB-Jo8wMUJ2WsL9qQ&s"},
  { name: "Paris", img: "https://a.travel-assets.com/findyours-php/viewfinder/images/res70/474000/474240-Left-Bank-Paris.jpg" },
  { name: "Bangkok", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTqnfffLuR8KCxRAr8IDKCsRPJLWQseSXymg&s" },
  { name: "Manali", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmnNVSLZ2C2VWzG4MqL8fiISxpipBO2eSWGg&s" },
  { name: "Singapore", img: "https://i.natgeofe.com/k/6af87ab7-b964-4f81-861a-8a831c65f5d9/ww-light-displays-trees.jpg?wp=1&w=1084.125&h=609" },
];

export default function Explore() {
  const navigate = useNavigate();

  const username = sessionStorage.getItem("username");
  const isLoggedIn = !!username;

  const [, setWhere] = useState("");

  const goToExplore = () => (isLoggedIn ? navigate('/search') : navigate('/signup'));

  return (
    <div className="explore-container">

      <Navbar />

      {/* HERO SECTION */}
      <section className="explore-hero">
        <div className="explore-hero-content">
          <h1><strong>Discover Your Next Adventure</strong> 🚀</h1>
          <p><strong>Explore more.</strong> Dream more. <span className="explore-word"><strong>Explore</strong> with TripWeaver.</span></p>
          <button className="get-started" onClick={goToExplore}>
            <strong>Explore Now</strong>
          </button>
        </div>
      </section>

      {/* (search pill removed as requested) */}

      {/* POPULAR PLACES */}
      <section className="popular-places">
        <h3>Popular Destinations</h3>
        <div className="places-grid">
          {popularPlaces.map((place) => (
            <div
              key={place.name}
              className="place-card"
              onClick={() => {
                setWhere(place.name);
                if (isLoggedIn) navigate(`/search?query=${encodeURIComponent(place.name)}`);
                else navigate('/signup');
              }}
              style={{ backgroundImage: `url(${place.img})` }}
            >
              <div className="place-label">{place.name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer>© 2025 TripWeaver — Explore. Discover. Travel.</footer>
    </div>
  );
}
