package com.tripweaver.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AmadeusExperienceService {

    @Value("${amadeus.api.key}")
    private String apiKey;

    @Value("${amadeus.api.secret}")
    private String apiSecret;

    private String accessToken;
    private long tokenExpiryTime = 0;

    private final RestTemplate restTemplate = new RestTemplate();

    // Static mapping of popular destinations to coordinates
    private static final Map<String, double[]> DESTINATION_COORDINATES = new HashMap<>();

    static {
        // Format: [latitude, longitude]
        DESTINATION_COORDINATES.put("goa", new double[]{15.2993, 74.1240});
        DESTINATION_COORDINATES.put("paris", new double[]{48.8566, 2.3522});
        DESTINATION_COORDINATES.put("tokyo", new double[]{35.6762, 139.6503});
        DESTINATION_COORDINATES.put("bangkok", new double[]{13.7563, 100.5018});
        DESTINATION_COORDINATES.put("bali", new double[]{-8.3405, 115.0920});
        DESTINATION_COORDINATES.put("new york", new double[]{40.7128, -74.0060});
        DESTINATION_COORDINATES.put("london", new double[]{51.5074, -0.1278});
        DESTINATION_COORDINATES.put("dubai", new double[]{25.2048, 55.2708});
        DESTINATION_COORDINATES.put("singapore", new double[]{1.3521, 103.8198});
        DESTINATION_COORDINATES.put("rome", new double[]{41.9028, 12.4964});
        DESTINATION_COORDINATES.put("barcelona", new double[]{41.3851, 2.1734});
        DESTINATION_COORDINATES.put("amsterdam", new double[]{52.3676, 4.9041});
        DESTINATION_COORDINATES.put("sydney", new double[]{-33.8688, 151.2093});
        DESTINATION_COORDINATES.put("mumbai", new double[]{19.0760, 72.8777});
        DESTINATION_COORDINATES.put("delhi", new double[]{28.7041, 77.1025});
        DESTINATION_COORDINATES.put("bangalore", new double[]{12.9716, 77.5946});
        DESTINATION_COORDINATES.put("thailand", new double[]{13.7563, 100.5018});
        DESTINATION_COORDINATES.put("india", new double[]{28.7041, 77.1025});
        DESTINATION_COORDINATES.put("japan", new double[]{35.6762, 139.6503});
    }

    /**
     * Get Amadeus access token
     */
    private String getAccessToken() {
        // Check if token is still valid
        if (accessToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            return accessToken;
        }

        try {
            String url = "https://test.api.amadeus.com/v1/security/oauth2/token";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            
            String body = "grant_type=client_credentials&client_id=" + apiKey + "&client_secret=" + apiSecret;
            
            HttpEntity<String> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                accessToken = (String) response.getBody().get("access_token");
                Integer expiresIn = (Integer) response.getBody().get("expires_in");
                tokenExpiryTime = System.currentTimeMillis() + (expiresIn * 1000L) - 60000; // Refresh 1 min before expiry
                return accessToken;
            }
        } catch (Exception e) {
            System.err.println("Error getting Amadeus access token: " + e.getMessage());
        }
        
        return null;
    }

    /**
     * Get coordinates for a destination
     */
    private double[] getCoordinates(String destination) {
        if (destination == null) {
            return null;
        }

        String lowerDest = destination.toLowerCase().trim();
        
        // Try exact match first
        if (DESTINATION_COORDINATES.containsKey(lowerDest)) {
            return DESTINATION_COORDINATES.get(lowerDest);
        }

        // Try partial match
        for (Map.Entry<String, double[]> entry : DESTINATION_COORDINATES.entrySet()) {
            if (lowerDest.contains(entry.getKey()) || entry.getKey().contains(lowerDest)) {
                return entry.getValue();
            }
        }

        return null;
    }

    /**
     * Fetch Points of Interest from Amadeus API
     */
    public List<Map<String, Object>> getExperiences(String destination) {
        try {
            double[] coords = getCoordinates(destination);
            
            if (coords == null) {
                return getFallbackExperiences(destination);
            }

            double latitude = coords[0];
            double longitude = coords[1];

            String token = getAccessToken();
            if (token == null) {
                return getFallbackExperiences(destination);
            }

            String url = String.format(
                "https://test.api.amadeus.com/v1/reference-data/locations/pois?latitude=%.4f&longitude=%.4f&radius=10",
                latitude, longitude
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.getBody().get("data");
                
                if (data != null && !data.isEmpty()) {
                    List<Map<String, Object>> experiences = new ArrayList<>();
                    
                    for (Map<String, Object> poi : data) {
                        Map<String, Object> experience = new HashMap<>();
                        
                        experience.put("id", poi.get("id"));
                        experience.put("title", poi.get("name"));
                        experience.put("category", poi.get("category"));
                        
                        Map<String, Object> geoCode = (Map<String, Object>) poi.get("geoCode");
                        if (geoCode != null) {
                            experience.put("latitude", geoCode.get("latitude"));
                            experience.put("longitude", geoCode.get("longitude"));
                        }
                        
                        if (poi.containsKey("tags")) {
                            experience.put("tags", poi.get("tags"));
                        }
                        
                        if (poi.containsKey("rank")) {
                            experience.put("rank", poi.get("rank"));
                        }
                        
                        experiences.add(experience);
                    }
                    
                    return experiences;
                }
            }

        } catch (Exception e) {
            System.err.println("Error fetching experiences from Amadeus: " + e.getMessage());
        }
        
        return getFallbackExperiences(destination);
    }

    /**
     * Get experiences with fallback
     */
    public List<Map<String, Object>> getExperiencesWithFallback(String destination) {
        return getExperiences(destination);
    }

    /**
     * Fallback static data for popular destinations
     */
    private List<Map<String, Object>> getFallbackExperiences(String destination) {
        List<Map<String, Object>> fallback = new ArrayList<>();
        String lowerDest = destination.toLowerCase();

        if (lowerDest.contains("goa")) {
            fallback.add(createExperience("Dolphin Watching", "BEACH_ACTIVITY", 15.2993, 74.1240));
            fallback.add(createExperience("Old Goa Churches", "HISTORICAL", 15.5007, 73.9117));
            fallback.add(createExperience("Baga Beach", "BEACH", 15.5559, 73.7516));
            fallback.add(createExperience("Spice Plantation Tour", "NATURE", 15.3004, 74.0855));
        } else if (lowerDest.contains("paris")) {
            fallback.add(createExperience("Eiffel Tower", "LANDMARK", 48.8584, 2.2945));
            fallback.add(createExperience("Louvre Museum", "MUSEUM", 48.8606, 2.3376));
            fallback.add(createExperience("Notre-Dame Cathedral", "HISTORICAL", 48.8530, 2.3499));
            fallback.add(createExperience("Arc de Triomphe", "LANDMARK", 48.8738, 2.2950));
        } else if (lowerDest.contains("tokyo")) {
            fallback.add(createExperience("Senso-ji Temple", "TEMPLE", 35.7148, 139.7967));
            fallback.add(createExperience("Tokyo Skytree", "LANDMARK", 35.7101, 139.8107));
            fallback.add(createExperience("Shibuya Crossing", "LANDMARK", 35.6595, 139.7004));
            fallback.add(createExperience("Meiji Shrine", "TEMPLE", 35.6764, 139.6993));
        } else if (lowerDest.contains("bangkok")) {
            fallback.add(createExperience("Grand Palace", "HISTORICAL", 13.7500, 100.4915));
            fallback.add(createExperience("Wat Pho", "TEMPLE", 13.7465, 100.4927));
            fallback.add(createExperience("Chatuchak Market", "SHOPPING", 13.7998, 100.5501));
            fallback.add(createExperience("Wat Arun", "TEMPLE", 13.7437, 100.4887));
        } else if (lowerDest.contains("bali")) {
            fallback.add(createExperience("Tanah Lot Temple", "TEMPLE", -8.6211, 115.0868));
            fallback.add(createExperience("Ubud Rice Terraces", "NATURE", -8.4095, 115.2861));
            fallback.add(createExperience("Mount Batur", "NATURE", -8.2421, 115.3753));
        } else if (lowerDest.contains("bangalore")) {
            fallback.add(createExperience("Lalbagh Botanical Garden", "NATURE", 12.9507, 77.5848));
            fallback.add(createExperience("Bangalore Palace", "HISTORICAL", 12.9980, 77.5926));
            fallback.add(createExperience("Cubbon Park", "NATURE", 12.9762, 77.5929));
        } else {
            // Generic fallback - use coordinates if available
            double[] coords = getCoordinates(destination);
            if (coords != null) {
                fallback.add(createExperience("City Center", "LANDMARK", coords[0], coords[1]));
                fallback.add(createExperience("Local Market", "SHOPPING", coords[0] + 0.01, coords[1] + 0.01));
            }
        }

        System.err.println("Using fallback data for " + destination);
        return fallback;
    }

    private Map<String, Object> createExperience(String title, String category, double lat, double lon) {
        Map<String, Object> exp = new HashMap<>();
        exp.put("id", UUID.randomUUID().toString());
        exp.put("title", title);
        exp.put("category", category);
        exp.put("latitude", lat);
        exp.put("longitude", lon);
        return exp;
    }
}
