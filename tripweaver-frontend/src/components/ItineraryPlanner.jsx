import React, { useMemo, useState } from "react";
import Navbar from "./navbar";
import { generateItinerary } from "../services/api";
import "./ItineraryPlanner.css";

export default function ItineraryPlanner() {
  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
  });
  const [itinerary, setItinerary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setItinerary("");

    // Date Validation
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      setError("End Date cannot be before Start Date!");
      setLoading(false);
      return;
    }

    try {
      const response = await generateItinerary(formData);
      setItinerary(response.data);
    } catch (err) {
      setError("Failed to generate itinerary. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parsedDays = useMemo(() => {
    if (!itinerary) return [];
    const lines = itinerary.split("\n");
    const days = [];
    let current = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("Day ")) {
        if (current) days.push(current);
        current = { title: line, items: [] };
      } else {
        if (!current) current = { title: "Itinerary", items: [] };
        current.items.push(line.replace(/^•\s*/, "• "));
      }
    }
    if (current) days.push(current);
    return days;
  }, [itinerary]);

  return (
    <>
      <Navbar />
      <div className="planner-wrapper">
        <div className="planner-panel">
          <h2>Itinerary Planner</h2>
          <form className="planner-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Destination</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                placeholder="e.g. Paris, Tokyo"
              />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Itinerary"}
            </button>
          </form>
          {error && <p className="error-msg">{error}</p>}
        </div>

        {!!parsedDays.length && (
          <div className="day-grid">
            {parsedDays.map((day, idx) => (
              <div key={idx} className="day-card">
                <h3>{day.title}</h3>
                <ul>
                  {day.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
