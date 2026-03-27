package com.tripweaver.model;

import jakarta.persistence.*;

@Entity
@Table(name = "collaboration_trip")
public class CollaborationTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String origin;
    private String destination;
    private String startDate;
    private String endDate;

    private String hostName;
    private String hostEmail;

    private Integer seatsAvailable;
    private Double totalCost;
    private Double pricePerPerson;
    private String note;

    @Column(columnDefinition = "TEXT")
    private String flightDetails;

    @Column(columnDefinition = "TEXT")
    private String returnFlightDetails;

    @Column(columnDefinition = "TEXT")
    private String hotelDetails;

    // ===== Getters & Setters =====

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getHostName() { return hostName; }
    public void setHostName(String hostName) { this.hostName = hostName; }

    public String getHostEmail() { return hostEmail; }
    public void setHostEmail(String hostEmail) { this.hostEmail = hostEmail; }

    public Integer getSeatsAvailable() { return seatsAvailable; }
    public void setSeatsAvailable(Integer seatsAvailable) { this.seatsAvailable = seatsAvailable; }

    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }

    public Double getPricePerPerson() { return pricePerPerson; }
    public void setPricePerPerson(Double pricePerPerson) { this.pricePerPerson = pricePerPerson; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getFlightDetails() { return flightDetails; }
    public void setFlightDetails(String flightDetails) { this.flightDetails = flightDetails; }

    public String getReturnFlightDetails() { return returnFlightDetails; }
    public void setReturnFlightDetails(String returnFlightDetails) { this.returnFlightDetails = returnFlightDetails; }

    public String getHotelDetails() { return hotelDetails; }
    public void setHotelDetails(String hotelDetails) { this.hotelDetails = hotelDetails; }
}
