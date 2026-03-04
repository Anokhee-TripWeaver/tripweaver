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
  const [dateErrors, setDateErrors] = useState({ startDate: "", endDate: "" });
  const [popupMessage, setPopupMessage] = useState("");
  
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

  const getTodayDateString = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };

  const isPastDate = (dateStr) => {
    if (!dateStr) return false;
    const selected = new Date(dateStr);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const validateDates = (nextFormData) => {
    const errors = { startDate: "", endDate: "" };
    if (isPastDate(nextFormData.startDate)) {
      errors.startDate = "Start date cannot be in the past.";
    }
    if (isPastDate(nextFormData.endDate)) {
      errors.endDate = "End date cannot be in the past.";
    }
    if (nextFormData.startDate && nextFormData.endDate) {
      const start = new Date(nextFormData.startDate);
      const end = new Date(nextFormData.endDate);
      if (end < start) {
        errors.endDate = "End date cannot be before start date.";
      }
    }
    return errors;
  };

  const hasDateErrors = (errors) => Boolean(errors.startDate || errors.endDate);

  const showPopup = (message) => {
    setPopupMessage(message);
    window.setTimeout(() => setPopupMessage(""), 2600);
  };

  const handleChange = (e) => {
    const nextFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(nextFormData);
    setDateErrors(validateDates(nextFormData));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const computedDateErrors = validateDates(formData);
    setDateErrors(computedDateErrors);
    if (hasDateErrors(computedDateErrors)) {
      const firstError = computedDateErrors.startDate || computedDateErrors.endDate;
      setError(firstError);
      showPopup(firstError);
      return;
    }

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
                  min={getTodayDateString()}
                  value={formData.startDate}
                  onChange={handleChange}
                  style={dateErrors.startDate ? { borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" } : undefined}
                  required
                />
                {dateErrors.startDate && <p className="date-error">{dateErrors.startDate}</p>}
              </div>
              <div className="field">
                <label>End Date</label>
                <input
                  type="date"
                  name="endDate"
                  min={formData.startDate || getTodayDateString()}
                  value={formData.endDate}
                  onChange={handleChange}
                  style={dateErrors.endDate ? { borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" } : undefined}
                  required
                />
                {dateErrors.endDate && <p className="date-error">{dateErrors.endDate}</p>}
              </div>
            </div>
            <button className="btn-primary" disabled={loading}>
              {loading ? "Crafting your trip..." : "Generate Itinerary"}
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>
        </section>
        {popupMessage && <div className="date-popup">{popupMessage}</div>}

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
