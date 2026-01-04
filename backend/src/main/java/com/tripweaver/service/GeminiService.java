package com.tripweaver.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.tripweaver.model.Destination;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    private DestinationService destinationService;

    public String generateItinerary(String destination, String startDate, String endDate) {
        // Calculate number of days
        long days = 1;
        try {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            days = ChronoUnit.DAYS.between(start, end) + 1;
        } catch (Exception e) {
            // Fallback if parsing fails
            days = 5; 
        }

        String prompt = String.format(
            "Create a highly detailed, time-based travel itinerary for a trip to %s from %s to %s (%d days). " +
            "Strictly follow this format for EACH day:\n\n" +
            "Day X (YYYY-MM-DD)\n" +
            "- Morning:\n" +
            "  • 07:00 AM: Start your day [Mention specific transport mode to first location]\n" +
            "  • 09:00 AM: [Attraction name] - [Brief description]\n" +
            "  • 11:00 AM: [Next Stop] (Transport: [e.g. Walk 10 mins / Take Metro Line 1])\n" +
            "- Afternoon:\n" +
            "  • 01:00 PM: Lunch at [Restaurant Name] (Cuisine: [Type])\n" +
            "  • 03:00 PM: [Activity] (Transport: [Details])\n" +
            "- Evening:\n" +
            "  • 07:00 PM: Dinner at [Restaurant Name]\n" +
            "  • 09:00 PM: [Optional Night Activity or Return to Hotel]\n" +
            "- Tips: [Specific local advice, e.g., 'Buy a 24h metro pass']\n\n" +
            "Ensure you generate a plan for EVERY single day from %s to %s. Do not skip any days.",
            destination, startDate, endDate, days, startDate, endDate
        );

        // Try Gemini endpoints first
        String[] geminiUrls = new String[] {
            "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey,
            "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=" + apiKey,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey
        };

        JSONObject content = new JSONObject()
            .put("role", "user")
            .put("parts", new JSONArray().put(new JSONObject().put("text", prompt)));
        JSONObject requestContentBody = new JSONObject().put("contents", new JSONArray().put(content));

        String geminiResponse = tryPostGenerate(requestContentBody, geminiUrls, true);
        if (geminiResponse != null) {
            return geminiResponse;
        }

        // Fallback to PaLM text-bison
        String[] palmUrls = new String[] {
            "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=" + apiKey
        };
        JSONObject palmBody = new JSONObject().put("prompt", new JSONObject().put("text", prompt));
        String palmResponse = tryPostGenerate(palmBody, palmUrls, false);
        if (palmResponse != null) {
            return palmResponse;
        }

        return buildFallbackItinerary(destination, startDate, endDate);
    }

    private String tryPostGenerate(JSONObject body, String[] urls, boolean parseAsGenerateContent) {
        for (String url : urls) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);

                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JSONObject json = new JSONObject(response.getBody());
                    if (parseAsGenerateContent) {
                        JSONArray candidates = json.optJSONArray("candidates");
                        if (candidates != null && !candidates.isEmpty()) {
                            JSONObject candidate = candidates.getJSONObject(0);
                            JSONObject candContent = candidate.optJSONObject("content");
                            if (candContent != null) {
                                JSONArray parts = candContent.optJSONArray("parts");
                                if (parts != null) {
                                    StringBuilder sb = new StringBuilder();
                                    for (int i = 0; i < parts.length(); i++) {
                                        sb.append(parts.getJSONObject(i).optString("text", ""));
                                    }
                                    if (sb.length() > 0) {
                                        return sb.toString();
                                    }
                                }
                            }
                        }
                    } else {
                        JSONArray candidates = json.optJSONArray("candidates");
                        if (candidates != null && !candidates.isEmpty()) {
                            JSONObject cand0 = candidates.getJSONObject(0);
                            String output = cand0.optString("output", "");
                            if (!output.isEmpty()) {
                                return output;
                            }
                        }
                        String output = json.optString("output", "");
                        if (!output.isEmpty()) {
                            return output;
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String buildFallbackItinerary(String destination, String startDate, String endDate) {
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            LocalDate start = LocalDate.parse(startDate, fmt);
            LocalDate end = LocalDate.parse(endDate, fmt);
            int days = (int) ChronoUnit.DAYS.between(start, end) + 1;
            if (days <= 0) days = 1;

            List<Destination> attractions = destinationService.searchDestinationsGoogle(destination, "tourist_attraction");
            List<Destination> restaurants = destinationService.searchDestinationsGoogle(destination, "restaurant");

            // Sort by rating desc, then user rating count
            Comparator<Destination> byQuality = Comparator
                    .comparing((Destination d) -> d.getRating() == null ? 0.0 : d.getRating()).reversed()
                    .thenComparing(d -> d.getUserRatingCount() == null ? 0 : d.getUserRatingCount(), Comparator.reverseOrder());

            attractions = attractions.stream().sorted(byQuality).collect(Collectors.toList());
            restaurants = restaurants.stream().sorted(byQuality).collect(Collectors.toList());

            int attractionsPerDay = 3;
            int restaurantsPerDay = 2;

            StringBuilder sb = new StringBuilder();
            sb.append("Trip Itinerary for ").append(destination).append(" (").append(startDate).append(" to ").append(endDate).append(")\n\n");

            int aIdx = 0, rIdx = 0;
            for (int d = 1; d <= days; d++) {
                LocalDate current = start.plusDays(d - 1);
                sb.append("Day ").append(d).append(" (").append(current.format(fmt)).append(")\n");
                sb.append("- Morning:\n");
                for (int i = 0; i < Math.min(attractionsPerDay, Math.max(0, attractions.size() - aIdx)); i++) {
                    Destination a = attractions.get(aIdx++);
                    sb.append("  • ").append(a.getName()).append(" — ").append(a.getAddress() != null ? a.getAddress() : "").append("\n");
                }
                sb.append("- Meals:\n");
                for (int i = 0; i < Math.min(restaurantsPerDay, Math.max(0, restaurants.size() - rIdx)); i++) {
                    Destination r = restaurants.get(rIdx++);
                    sb.append("  • ").append(r.getName()).append(" — ").append(r.getAddress() != null ? r.getAddress() : "").append("\n");
                }
                sb.append("- Tips:\n");
                sb.append("  • Use public transport or walk between nearby spots.\n");
                sb.append("  • Book tickets in advance for popular attractions.\n\n");
            }

            if (sb.length() == 0) {
                return "No itinerary generated.";
            }
            return sb.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return "No itinerary generated.";
        }
    }
}
