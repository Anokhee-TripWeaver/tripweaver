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

    public String generateItinerary(String destination, String startDate, String endDate) {
        String cleanKey = apiKey.trim().replace("\"", "").replace("'", "");

        // 1. Build a High-Detail Prompt
        String prompt = String.format(
            "You are a professional travel planner. Generate a highly detailed, luxury-grade travel itinerary for %s from %s to %s. " +
            "For EACH day, follow this exact structure and include a dashed line separator (---) at the end of each day:\n\n" +
            "DAY X (YYYY-MM-DD)\n" +
            "Morning (08:00 AM - 12:00 PM): Provide 3-4 sentences on specific historical landmarks or hidden gems. Mention specific entry gates or local secrets.\n" +
            "Lunch (01:00 PM): Mention a specific, highly-rated local restaurant and one signature dish to try.\n" +
            "Afternoon (02:30 PM - 06:00 PM): Plan a high-activity or scenic spot with local transport tips.\n" +
            "Dinner (07:30 PM): Suggest a fine dining or unique atmospheric restaurant with price indicators.\n" +
            "Evening: Suggest a night-walk, a rooftop bar, or a cultural performance.\n" +
            "Logistics: Estimated walking time and recommended mode of transport (e.g., 'Take the Metro Line 2 to save 30 mins').\n" +
            "Estimated Daily Cost: ₹ [Total] INR (detailed breakdown of entry fees and food).\n" +
            "---", 
            destination, startDate, endDate
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
                    System.out.println("Model " + baseUrl + " error: " + e.getMessage());
                    break; // Move to next model
                }
            }
        }
        return "Error: All AI paths are currently congested. Please try again in 1 minute.";
    }
}