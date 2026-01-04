package com.tripweaver.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.tripweaver.model.Flight;

@Service
public class FlightService {

    @Value("${amadeus.api.key}")
    private String amadeusApiKey;

    @Value("${amadeus.api.secret}")
    private String amadeusApiSecret;

    private final RestTemplate restTemplate = new RestTemplate();
    private String accessToken;
    private long tokenExpiryTime;

    public List<Flight> searchFlights(String origin, String destination, String date) {
        List<Flight> flights = new ArrayList<>();

        try {
            String token = getAccessToken();
            if (token != null) {
                System.out.println("Token received: " + token.substring(0, 10) + "...");
                System.out.println("Resolving IATA codes for: " + origin + ", " + destination);
                
                // Resolve IATA codes if input is not 3 characters
                String originCode = resolveIataCode(origin, token);
                String destCode = resolveIataCode(destination, token);
                
                System.out.println("Resolved IATA: " + origin + "->" + originCode + ", " + destination + "->" + destCode);

                if (originCode == null || destCode == null) {
                     System.out.println("Could not resolve IATA codes.");
                     return mockFlights(origin, destination, date);
                }

                String url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
                        + "?originLocationCode=" + originCode
                        + "&destinationLocationCode=" + destCode
                        + "&departureDate=" + date
                        + "&adults=1"
                        + "&max=10";

                System.out.println("Calling URL: " + url);

                HttpHeaders headers = new HttpHeaders();
                headers.setBearerAuth(token);
                HttpEntity<String> entity = new HttpEntity<>(headers);

                try {
                    ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
                    System.out.println("Amadeus Response Status: " + response.getStatusCode());
                    // System.out.println("Amadeus Response Body: " + response.getBody()); // Uncomment for full debug

                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        JSONObject json = new JSONObject(response.getBody());
                        if (json.has("data")) {
                            JSONArray data = json.getJSONArray("data");
                            System.out.println("Found " + data.length() + " flight offers.");
                            for (int i = 0; i < data.length(); i++) {
                            JSONObject offer = data.getJSONObject(i);
                            JSONArray itineraries = offer.getJSONArray("itineraries");
                            
                            // Usually take the first itinerary (outbound)
                            if (itineraries.length() > 0) {
                                JSONObject itinerary = itineraries.getJSONObject(0);
                                JSONArray segments = itinerary.getJSONArray("segments");
                                
                                // First segment for departure, Last segment for arrival
                                JSONObject firstSegment = segments.getJSONObject(0);
                                JSONObject lastSegment = segments.getJSONObject(segments.length() - 1);
                                
                                Flight flight = new Flight();
                                flight.setAirline(firstSegment.getString("carrierCode")); // Just carrier code for now
                                flight.setFlightNumber(firstSegment.getString("carrierCode") + firstSegment.getString("number"));
                                flight.setDepartureAirport(firstSegment.getJSONObject("departure").getString("iataCode"));
                                flight.setArrivalAirport(lastSegment.getJSONObject("arrival").getString("iataCode"));
                                flight.setDepartureTime(firstSegment.getJSONObject("departure").getString("at"));
                                flight.setArrivalTime(lastSegment.getJSONObject("arrival").getString("at"));
                                
                                // Try to get price
                                if (offer.has("price")) {
                                    flight.setPrice(offer.getJSONObject("price").getString("total") + " " + offer.getJSONObject("price").getString("currency"));
                                }

                                flights.add(flight);
                            }
                        }
                    }
                }
                } catch (Exception e) {
                    System.out.println("Amadeus API request failed: " + e.getMessage());
                    e.printStackTrace();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Amadeus API failed, falling back to mock data.");
        }

        // Fallback mock if API fails or returns no results
        if (flights.isEmpty()) {
            System.out.println("No flights found via API, returning mock data.");
            flights = mockFlights(origin, destination, date);
        }

        return flights;
    }

    private String resolveIataCode(String location, String token) {
        if (location == null || location.trim().isEmpty()) return null;
        // If it's already 3 letters, assume it's an IATA code (e.g., HYD, BOM)
        if (location.trim().length() == 3) {
            return location.trim().toUpperCase();
        }

        try {
            // Use Amadeus City Search to find the IATA code
            String url = "https://test.api.amadeus.com/v1/reference-data/locations"
                    + "?subType=CITY,AIRPORT"
                    + "&keyword=" + location
                    + "&page[limit]=1";
            
            System.out.println("Resolving " + location + " via URL: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
            
            // System.out.println("Resolve Response: " + response.getBody()); // Debug

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JSONObject json = new JSONObject(response.getBody());
                if (json.has("data")) {
                    JSONArray data = json.getJSONArray("data");
                    if (data.length() > 0) {
                        return data.getJSONObject(0).getString("iataCode");
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("Failed to resolve IATA code for: " + location);
            e.printStackTrace();
        }
        
        return null; // Could not resolve
    }

    private String getAccessToken() {
        if (accessToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            return accessToken;
        }

        try {
            String url = "https://test.api.amadeus.com/v1/security/oauth2/token";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
            map.add("grant_type", "client_credentials");
            map.add("client_id", amadeusApiKey);
            map.add("client_secret", amadeusApiSecret);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JSONObject json = new JSONObject(response.getBody());
                accessToken = json.getString("access_token");
                // Expires in is in seconds, reduce by 60s for safety
                tokenExpiryTime = System.currentTimeMillis() + (json.getLong("expires_in") - 60) * 1000;
                return accessToken;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private List<Flight> mockFlights(String origin, String destination, String date) {
        List<Flight> demo = new ArrayList<>();
        // Use a seed based on inputs so results are consistent for the same search but different for others
        long seed = (origin + destination + date).hashCode();
        java.util.Random random = new java.util.Random(seed);

        String[] airlines = {"IndiGo", "Air India", "Vistara", "SpiceJet", "Emirates", "Lufthansa"};
        String[] airlineCodes = {"6E", "AI", "UK", "SG", "EK", "LH"};
        
        // Generate 5-10 flights
        int numFlights = 5 + random.nextInt(6);
        
        for (int i = 0; i < numFlights; i++) {
            Flight f = new Flight();
            int airlineIdx = random.nextInt(airlines.length);
            f.setAirline(airlines[airlineIdx]);
            f.setFlightNumber(airlineCodes[airlineIdx] + (100 + random.nextInt(900)));
            f.setDepartureAirport(origin); 
            f.setArrivalAirport(destination);
            
            // Random time
            int hour = 6 + random.nextInt(16); // 6 AM to 10 PM
            int minute = random.nextInt(60);
            String depTime = String.format("%sT%02d:%02d:00", date, hour, minute);
            
            // Duration 1-12 hours
            int durationMinutes = 60 + random.nextInt(720);
            int arrHour = (hour + durationMinutes / 60) % 24;
            int arrMinute = (minute + durationMinutes % 60) % 60;
            
            // Handle next day arrival if needed (simplified, keeping same date for simplicity or incrementing if needed)
            String arrTime = String.format("%sT%02d:%02d:00", date, arrHour, arrMinute);
            
            f.setDepartureTime(depTime);
            f.setArrivalTime(arrTime);
            
            // Random price
            int price = 3000 + random.nextInt(15000);
            f.setPrice(price + " INR");
            
            demo.add(f);
        }
        return demo;
    }
}
