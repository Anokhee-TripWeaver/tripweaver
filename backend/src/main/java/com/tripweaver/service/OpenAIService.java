package com.tripweaver.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateItinerary(String destination, String startDate, String endDate) {
        try {
            String url = "https://api.openai.com/v1/chat/completions";

            String prompt = String.format(
                "Create a travel itinerary for a trip to %s from %s to %s. " +
                "Provide a day-by-day plan including places to visit, restaurants, and activities. " +
                "Format the response in a clean, readable way (you can use Markdown).",
                destination, startDate, endDate
            );

            JSONObject message = new JSONObject();
            message.put("role", "user");
            message.put("content", prompt);

            JSONObject requestBody = new JSONObject();
            requestBody.put("model", "gpt-3.5-turbo"); // Or "gpt-4" if available
            requestBody.put("messages", new JSONArray().put(message));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<String> entity = new HttpEntity<>(requestBody.toString(), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JSONObject jsonResponse = new JSONObject(response.getBody());
                JSONArray choices = jsonResponse.optJSONArray("choices");
                if (choices != null && choices.length() > 0) {
                    JSONObject choice = choices.getJSONObject(0);
                    JSONObject msg = choice.optJSONObject("message");
                    if (msg != null) {
                        return msg.optString("content");
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Error generating itinerary: " + e.getMessage();
        }
        return "No itinerary generated.";
    }
}
