package com.tripweaver.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_trips")
public class SavedTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String destination;
    private String startDate;
    private String endDate;
    private Double totalCost;
    private Double budget;
    private String username;
    private String email;

    // 🔥 NEW FIELDS FOR COLLABORATION
    private Boolean openTrip = false;
    private Integer seatsAvailable;
    private String note;

    @Column(columnDefinition = "TEXT")
    private String flightDetails;

    @Column(columnDefinition = "TEXT")
    private String returnFlightDetails;

    @Column(columnDefinition = "TEXT")
    private String hotelDetails;

    private LocalDateTime createdAt;

    public SavedTrip() {
        this.createdAt = LocalDateTime.now();
    }

    // ================= GETTERS & SETTERS =================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }

    public Double getBudget() { return budget; }
    public void setBudget(Double budget) { this.budget = budget; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Boolean getOpenTrip() { return openTrip; }
    public void setOpenTrip(Boolean openTrip) { this.openTrip = openTrip; }

    public Integer getSeatsAvailable() { return seatsAvailable; }
    public void setSeatsAvailable(Integer seatsAvailable) { this.seatsAvailable = seatsAvailable; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getFlightDetails() { return flightDetails; }
    public void setFlightDetails(String flightDetails) { this.flightDetails = flightDetails; }

    public String getReturnFlightDetails() { return returnFlightDetails; }
    public void setReturnFlightDetails(String returnFlightDetails) { this.returnFlightDetails = returnFlightDetails; }

    public String getHotelDetails() { return hotelDetails; }
    public void setHotelDetails(String hotelDetails) { this.hotelDetails = hotelDetails; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
