package com.tripweaver.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trip_expenses")
public class TripExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String description;
    private BigDecimal amount;
    private String paidByEmail;
    private String paidByName;
    private String splitType;

    @Column(columnDefinition = "TEXT")
    private String splitBetweenCsv;

    private LocalDateTime createdAt;

    public TripExpense() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaidByEmail() { return paidByEmail; }
    public void setPaidByEmail(String paidByEmail) { this.paidByEmail = paidByEmail; }

    public String getPaidByName() { return paidByName; }
    public void setPaidByName(String paidByName) { this.paidByName = paidByName; }

    public String getSplitType() { return splitType; }
    public void setSplitType(String splitType) { this.splitType = splitType; }

    public String getSplitBetweenCsv() { return splitBetweenCsv; }
    public void setSplitBetweenCsv(String splitBetweenCsv) { this.splitBetweenCsv = splitBetweenCsv; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
