package com.tripweaver.service;

import com.tripweaver.model.Hotel;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HotelService {

    private final List<Hotel> allHotels = new ArrayList<>();

    public HotelService() {
        loadHotels();
    }

    private void loadHotels() {
        try {
            ClassPathResource resource = new ClassPathResource("data/booking_hotel.csv");
            BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8));
            
            String line;
            boolean firstLine = true;
            int lineNumber = 0;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (firstLine) {
                    firstLine = false;
                    continue;
                }
                
                // Regex to split by comma ignoring quotes
                String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                
                // Skip secondary header that might appear mid-file
                if (parts.length >= 2 && "city".equalsIgnoreCase(parts[0]) && "name".equalsIgnoreCase(parts[1])) {
                    continue;
                }
                
                if (parts.length >= 9) {
                    // Extra cleanup for rows from 3508 onwards (dataset tail often has encoding / format issues)
                    boolean heavyCleanup = lineNumber >= 3508;
                    if (heavyCleanup) {
                        for (int i = 0; i < parts.length; i++) {
                            parts[i] = sanitize(parts[i]);
                        }
                    }
                    
                    Hotel hotel = new Hotel();
                    hotel.setName(clean(parts[0]));
                    hotel.setAddress(clean(parts[1]));
                    
                    try {
                        hotel.setRating(Double.parseDouble(clean(parts[2])));
                    } catch (NumberFormatException e) {
                        hotel.setRating(0.0);
                    }

                    hotel.setRoomType(clean(parts[6]));
                    
                    // Parse price: Remove non-numeric characters except dot
                    // Also handle potential encoding issues or spaces
                    String rawPrice = clean(parts[8]);
                    String priceStr = rawPrice.replaceAll("[^0-9.]", "");
                    try {
                        if (!priceStr.isEmpty()) {
                             hotel.setPrice(Double.parseDouble(priceStr));
                        }
                    } catch (NumberFormatException e) {
                        hotel.setPrice(0.0);
                    }
                    
                    // Skip entries without a valid name or address (post-cleaning)
                    if (hotel.getName() == null || hotel.getName().isBlank()) continue;
                    if (hotel.getAddress() == null || hotel.getAddress().isBlank()) continue;
                    
                    allHotels.add(hotel);
                } else if (parts.length >= 5) {
                    // Handle simplified manual schema: city,name,location,rating_text,price
                    boolean heavyCleanup = lineNumber >= 3508;
                    if (heavyCleanup) {
                        for (int i = 0; i < parts.length; i++) {
                            parts[i] = sanitize(parts[i]);
                        }
                    }
                    
                    String city = clean(parts[0]);
                    String name = clean(parts[1]);
                    String location = clean(parts[2]);
                    String ratingText = clean(parts[3]);
                    String priceText = clean(parts[4]);
                    
                    if (name == null || name.isBlank() || location == null || location.isBlank()) {
                        continue;
                    }
                    
                    Hotel hotel = new Hotel();
                    hotel.setName(name);
                    // Compose address to include city for better matching
                    hotel.setAddress(location + (city.isBlank() ? "" : ", " + city));
                    hotel.setRoomType("Standard");
                    
                    // Extract first numeric rating value from descriptive text
                    double ratingVal = extractRating(ratingText);
                    hotel.setRating(ratingVal);
                    
                    // Normalize price (may be empty)
                    String priceDigits = priceText.replaceAll("[^0-9.]", "");
                    try {
                        hotel.setPrice(priceDigits.isEmpty() ? 0.0 : Double.parseDouble(priceDigits));
                    } catch (NumberFormatException e) {
                        hotel.setPrice(0.0);
                    }
                    
                    allHotels.add(hotel);
                }
            }
            reader.close();
        } catch (Exception e) {
            System.err.println("Failed to load hotels from CSV: " + e.getMessage());
        }
    }

    private String clean(String input) {
        if (input == null) return "";
        String s = input.trim();
        if (s.startsWith("\"") && s.endsWith("\"")) {
            return s.substring(1, s.length() - 1).trim();
        }
        return s;
    }
    
    // Aggressive sanitization used for problematic tail rows (>= 3508)
    private String sanitize(String input) {
        if (input == null) return "";
        String s = input.trim();
        // Strip surrounding quotes first
        if (s.startsWith("\"") && s.endsWith("\"")) {
            s = s.substring(1, s.length() - 1).trim();
        }
        // Remove non-printable / replacement chars and unusual symbols (keep letters, numbers, common punctuation)
        s = s.replaceAll("[^\\p{L}\\p{N}\\s,./&()\\-]", "");
        // Collapse excessive whitespace
        s = s.replaceAll("\\s{2,}", " ");
        return s.trim();
    }
    
    private double extractRating(String ratingText) {
        if (ratingText == null) return 0.0;
        String cleaned = ratingText.replace(',', ' ');
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+(?:\\.\\d+)?)").matcher(cleaned);
        if (m.find()) {
            try {
                return Double.parseDouble(m.group(1));
            } catch (NumberFormatException ignored) { }
        }
        return 0.0;
    }

    public List<Hotel> searchHotels(String destination, Double maxPrice) {
        String destLower = destination.toLowerCase().trim();
        
        List<Hotel> filtered = allHotels.stream()
                .filter(h -> {
                    boolean matches = h.getAddress().toLowerCase().contains(destLower) || 
                                      h.getName().toLowerCase().contains(destLower);
                    return matches;
                })
                .collect(Collectors.toList());

        if (maxPrice != null && maxPrice > 0) {
            filtered = filtered.stream()
                    .filter(h -> h.getPrice() <= maxPrice)
                    .collect(Collectors.toList());
        }

        return filtered;
    }
}
