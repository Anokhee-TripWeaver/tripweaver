package com.tripweaver.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "trip_booking")
public class TripBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String bookedByEmail;
    private String bookedByName;

    @ElementCollection
    private List<String> travellerEmails;

    @ElementCollection
    private List<String> travellerNames;

    private Integer totalTravellers;
    private Double totalCost;
    private String bookingReference;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }
    public String getBookedByEmail() { return bookedByEmail; }
    public void setBookedByEmail(String bookedByEmail) { this.bookedByEmail = bookedByEmail; }
    public String getBookedByName() { return bookedByName; }
    public void setBookedByName(String bookedByName) { this.bookedByName = bookedByName; }
    public List<String> getTravellerEmails() { return travellerEmails; }
    public void setTravellerEmails(List<String> travellerEmails) { this.travellerEmails = travellerEmails; }
    public List<String> getTravellerNames() { return travellerNames; }
    public void setTravellerNames(List<String> travellerNames) { this.travellerNames = travellerNames; }
    public Integer getTotalTravellers() { return totalTravellers; }
    public void setTotalTravellers(Integer totalTravellers) { this.totalTravellers = totalTravellers; }
    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }
    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }
}
