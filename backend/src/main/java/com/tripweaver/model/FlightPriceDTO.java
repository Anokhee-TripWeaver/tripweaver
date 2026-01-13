package com.tripweaver.model;

public class FlightPriceDTO {
    private String airlineCode;
    private String flightNumber;
    private String origin;
    private String destination;
    private String priceTotal;

    public String getAirlineCode() { return airlineCode; }
    public void setAirlineCode(String airlineCode) { this.airlineCode = airlineCode; }
    public String getFlightNumber() { return flightNumber; }
    public void setFlightNumber(String flightNumber) { this.flightNumber = flightNumber; }
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public String getPriceTotal() { return priceTotal; }
    public void setPriceTotal(String priceTotal) { this.priceTotal = priceTotal; }
}
