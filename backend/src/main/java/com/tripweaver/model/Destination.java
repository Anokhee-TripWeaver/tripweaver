package com.tripweaver.model;

public class Destination {

    private String name;
    private String address;
    private double latitude;
    private double longitude;
    private String category;
    private String placeId;
    private String photoReference;
    private String photoUrl;
    private java.util.List<String> photoUrls;
    private Double rating;
    private Integer userRatingCount;

    // Default constructor
    public Destination() {}

    // Constructor with essential fields
    public Destination(String name, String address, double latitude, double longitude, String category, String placeId) {
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.category = category;
        this.placeId = placeId;
    }

    // Constructor with all fields
    public Destination(String name, String address, double latitude, double longitude, String category, String placeId,
                       String photoReference, String photoUrl, Double rating, Integer userRatingCount) {
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.category = category;
        this.placeId = placeId;
        this.photoReference = photoReference;
        this.photoUrl = photoUrl;
        this.rating = rating;
        this.userRatingCount = userRatingCount;
    }

    // Getters
    public String getName() { return name; }
    public String getAddress() { return address; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public String getCategory() { return category; }
    public String getPlaceId() { return placeId; }
    public String getPhotoReference() { return photoReference; }
    public String getPhotoUrl() { return photoUrl; }
    public java.util.List<String> getPhotoUrls() { return photoUrls; }
    public Double getRating() { return rating; }
    public Integer getUserRatingCount() { return userRatingCount; }

    // Setters
    public void setName(String name) { this.name = name; }
    public void setAddress(String address) { this.address = address; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public void setCategory(String category) { this.category = category; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }
    public void setPhotoReference(String photoReference) { this.photoReference = photoReference; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public void setPhotoUrls(java.util.List<String> photoUrls) { this.photoUrls = photoUrls; }
    public void setRating(Double rating) { this.rating = rating; }
    public void setUserRatingCount(Integer userRatingCount) { this.userRatingCount = userRatingCount; }

    // toString() for debugging
   
}
