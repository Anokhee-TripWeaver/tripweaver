package com.tripweaver.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "search_history")
public class SearchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, length = 500)
    private String query;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String type;

    @Column(name = "searched_at")
    private LocalDateTime searchedAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String origin;
    private String destination;
    private String searchDate;

    public SearchHistory() {}

    public SearchHistory(String origin, String destination, String searchDate, User user) {
        this.origin = origin;
        this.destination = destination;
        this.searchDate = searchDate;
        this.user = user;
        this.email = user.getEmail();
        this.query = origin + " -> " + destination;
        this.category = searchDate;
        this.type = "TRIP";
        this.searchedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.searchedAt == null) {
            this.searchedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getSearchDate() { return searchDate; }
    public void setSearchDate(String searchDate) { this.searchDate = searchDate; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getSearchedAt() { return searchedAt; }
}
