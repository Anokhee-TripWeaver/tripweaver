import React, { useMemo, useState, useEffect } from "react";
import Navbar from "./navbar";
import { generateItinerary } from "../services/api";
import { useLocation } from "react-router-dom";
import "./ItineraryPlanner.css";

export default function ItineraryPlanner() {
  const [formData, setFormData] = useState({ destination: "", startDate: "", endDate: "" });
  const [itinerary, setItinerary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const location = useLocation();

  useEffect(() => {
    if (location.state?.restore) {
        const h = location.state.restore;
        // Parse query if possible: "destination (start -> end)"
        // Or use h.destination if available (SearchHistory has it?)
        // Backend SearchHistory model has 'destination', 'searchDate' but maybe not separate 'startDate'/'endDate'
        // But the 'query' string in GeminiController is formatted as "Dest (Start -> End)"
        
        let dest = h.destination || "";
        let start = "";
        let end = "";
        
        // Try parsing query string if structured
        if (h.query && h.query.includes("(") && h.query.includes("→")) {
            try {
                // Example: "Paris (2025-01-01 → 2025-01-05)"
                const parts = h.query.split("(");
                if (parts.length > 0) {
                     dest = parts[0].trim();
                     const datePart = parts[1].replace(")", ""); // "2025-01-01 → 2025-01-05"
                     const dates = datePart.split("→");
                     if (dates.length === 2) {
                         start = dates[0].trim();
                         end = dates[1].trim();
                     }
                }
            } catch (e) {
                console.log("Error parsing history query", e);
            }
        }
        setFormData({
            destination: dest,
            startDate: start,
            endDate: end
        });
        
        // Optionally auto-submit if we have all data?
        // Let's just pre-fill for now to let user confirm.
    }
  }, [location.state]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setItinerary(""); // Clear previous results
    try {
      const response = await generateItinerary(formData);
      setItinerary(response.data);
    } catch (err) {
      setError("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const parsedDays = useMemo(() => {
    if (!itinerary) return [];
    const sections = itinerary.split(/(?=Day \d+)/); 
    return sections.map(section => {
      const lines = section.trim().split("\n");
      return {
        title: lines[0], 
        activities: lines.slice(1).filter(line => line.trim() !== "")
      };
    }).filter(day => day.title);
  }, [itinerary]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="planner-wrapper">
      <Navbar />
      <main className="itinerary-page">
        <header className="page-header">
          <h1>Trip Weaver</h1>
          <p>Your personalized time-based travel guide</p>
        </header>

        <section className="planner-card">
          <form onSubmit={handleSubmit} className="planner-form">
            <div className="field">
              <label>Destination</label>
              <input 
                type="text" 
                name="destination" 
                placeholder="e.g. Paris, France"
                value={formData.destination} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Start Date</label>
                <input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate} 
                  min={today}
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="field">
                <label>End Date</label>
                <input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate} 
                  min={formData.startDate || today}
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
            <button className="btn-primary" disabled={loading}>
              {loading ? "Crafting your trip..." : "Generate Itinerary"}
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>
        </section>

        {parsedDays.length > 0 && (
          <div className="results-section">
            {parsedDays.map((day, idx) => (
              <div key={idx} className="day-card">
                <h2 className="day-title">{day.title}</h2>
                <div className="timeline">
                  {day.activities.map((act, i) => (
                    <div key={i} className={`timeline-item ${act.includes("Cost") ? "cost-highlight" : ""}`}>
                      {!act.includes("Cost") && <span className="dot"></span>}
                      <p>{act}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}