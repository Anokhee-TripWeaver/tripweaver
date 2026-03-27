package com.tripweaver.model;

public class PackingItemDTO {
    private Long id;
    private Long bookingId;
    private String itemName;
    private Boolean isChecked;

    public PackingItemDTO() {
    }

    public PackingItemDTO(Long id, Long bookingId, String itemName, Boolean isChecked) {
        this.id = id;
        this.bookingId = bookingId;
        this.itemName = itemName;
        this.isChecked = isChecked;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getBookingId() {
        return bookingId;
    }

    public void setBookingId(Long bookingId) {
        this.bookingId = bookingId;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public Boolean getIsChecked() {
        return isChecked;
    }

    public void setIsChecked(Boolean isChecked) {
        this.isChecked = isChecked;
    }
}
