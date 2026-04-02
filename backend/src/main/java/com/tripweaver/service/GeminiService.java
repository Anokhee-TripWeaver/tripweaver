package com.tripweaver.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateItinerary(String destination, String startDate, String endDate,
                                     String travelWith, String interests, String budget, String pace) {
        String cleanKey = apiKey.trim().replace("\"", "").replace("'", "");

        String travelContext = switch (travelWith) {
            case "friends" -> "a group of friends";
            case "family" -> "a family with children";
            case "couple" -> "a couple on a romantic trip";
            case "business" -> "a business traveller";
            default -> "a solo traveller";
        };

        String paceNote = switch (pace) {
            case "relaxed" -> "Keep the pace relaxed with plenty of free time and rest.";
            case "packed" -> "Pack as many activities as possible each day.";
            default -> "Keep a moderate pace balancing activities and rest.";
        };

        String budgetNote = switch (budget) {
            case "budget" -> "Focus on budget-friendly options, street food, and free attractions.";
            case "luxury" -> "Suggest luxury hotels, fine dining, and premium experiences.";
            default -> "Mix of mid-range restaurants and moderately priced activities.";
        };

        String interestNote = (interests != null && !interests.isBlank())
            ? "The traveller is especially interested in: " + interests + "."
            : "";

        String prompt = String.format(
            "You are a professional travel planner. Generate a highly detailed travel itinerary for %s from %s to %s. " +
            "This trip is for %s. %s %s %s\n\n" +
            "For EACH day, follow this exact structure:\n\n" +
            "DAY X (YYYY-MM-DD)\n" +
            "Morning (08:00 AM - 12:00 PM): 3-4 sentences on specific landmarks or hidden gems.\n" +
            "Lunch (01:00 PM): Specific local restaurant and signature dish.\n" +
            "Afternoon (02:30 PM - 06:00 PM): Activity or scenic spot with transport tips.\n" +
            "Dinner (07:30 PM): Restaurant suggestion with atmosphere description.\n" +
            "Evening: Night-walk, rooftop bar, or cultural experience.\n" +
            "Logistics: Estimated travel time and recommended transport.\n" +
            "Estimated Daily Cost: ₹ [Total] INR (breakdown).\n" +
            "---",
            destination, startDate, endDate,
            travelContext, paceNote, budgetNote, interestNote
        );

        // 2. Stable Endpoints
        String[] modelEndpoints = {
                        "https://generativelanguage.googleapis.com/v1/models/gemini-3-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent",
            "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
        };

        // 3. Request Config
        JSONObject config = new JSONObject()
            .put("temperature", 1.0) // 2026 standard for Gemini 3 (best for creative planning)
            .put("maxOutputTokens", 4096) 
            .put("topP", 0.95);

        for (String baseUrl : modelEndpoints) {
            int retryDelay = 2000;
            for (int i = 0; i < 3; i++) {
                try {
                    String fullUrl = baseUrl + "?key=" + cleanKey;

                    JSONObject textPart = new JSONObject().put("text", prompt);
                    JSONObject content = new JSONObject().put("parts", new JSONArray().put(textPart));
                    JSONObject body = new JSONObject()
                        .put("contents", new JSONArray().put(content))
                        .put("generationConfig", config);

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);

                    ResponseEntity<String> response = restTemplate.postForEntity(fullUrl, entity, String.class);

                    if (response.getStatusCode().is2xxSuccessful()) {
                        JSONObject json = new JSONObject(response.getBody());
                        return json.getJSONArray("candidates")
                                   .getJSONObject(0)
                                   .getJSONObject("content")
                                   .getJSONArray("parts")
                                   .getJSONObject(0)
                                   .getString("text");
                    }
                } catch (org.springframework.web.client.HttpServerErrorException.ServiceUnavailable e) {
                    // Handle 503 Overloaded with Exponential Backoff
                    try { Thread.sleep(retryDelay); } catch (InterruptedException ignored) {}
                    retryDelay *= 2; 
                } catch (Exception e) {
                    System.err.println("Model " + baseUrl + " error: " + e.getMessage());
                    break; // Move to next model
                }
            }
        }
        return "Error: All AI paths are currently congested. Please try again in 1 minute.";
    }
}