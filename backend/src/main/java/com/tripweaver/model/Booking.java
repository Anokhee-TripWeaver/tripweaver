package com.tripweaver.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String destination;
    private String startDate;
    private String endDate;
    private Double totalCost;
    private String username;

    @Column(columnDefinition = "TEXT")
    private String flightDetails;

    @Column(columnDefinition = "TEXT")
    private String returnFlightDetails;

    @Column(columnDefinition = "TEXT")
    private String hotelDetails;

    private LocalDateTime bookingDate;
    private String status; // CONFIRMED, CANCELLED

    public Booking() {
        this.bookingDate = LocalDateTime.now();
        this.status = "CONFIRMED";
    }

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

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFlightDetails() { return flightDetails; }
    public void setFlightDetails(String flightDetails) { this.flightDetails = flightDetails; }

    public String getReturnFlightDetails() { return returnFlightDetails; }
    public void setReturnFlightDetails(String returnFlightDetails) { this.returnFlightDetails = returnFlightDetails; }

    public String getHotelDetails() { return hotelDetails; }
    public void setHotelDetails(String hotelDetails) { this.hotelDetails = hotelDetails; }

    public LocalDateTime getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDateTime bookingDate) { this.bookingDate = bookingDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
