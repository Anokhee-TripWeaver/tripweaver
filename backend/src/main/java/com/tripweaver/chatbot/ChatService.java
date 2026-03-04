package com.tripweaver.chatbot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class ChatService {

    @Value("${chatbot.groq.key}")
    private String groqApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    
    // Groq model with 30 requests/minute (much better than Gemini's 20/day)
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    public String getReply(String userMessage) {
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return "Please ask me about travel destinations, planning, or tips! 🌍";
        }

        try {
            // Call Groq API
            return callGroqAPI(userMessage);
            
        } catch (Exception e) {
            System.err.println("Groq API Error: " + e.getMessage());
            
            // Return a friendly response
            return "I'm here to help with travel advice! For personalized recommendations, " +
                   "tell me what kind of trip you're planning. Beach, city, mountain, or cultural adventure? ✈️";
        }
    }
    
    private String callGroqAPI(String userMessage) {
        String url = "https://api.groq.com/openai/v1/chat/completions";
        
        System.out.println("🚀 Calling Groq API with model: " + GROQ_MODEL);
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + groqApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // System prompt to restrict to travel topics
        String systemPrompt = "You are TripWeaver AI, a specialized travel planning assistant. " +
                            "You MUST ONLY answer questions about TRAVEL, TOURISM, VACATIONS, and TRIP PLANNING.\n\n" +
                            "ALLOWED TOPICS ONLY:\n" +
                            "• Destination recommendations\n" +
                            "• Hotel & accommodation booking\n" +
                            "• Flight/train/bus transportation\n" +
                            "• Itinerary planning\n" +
                            "• Travel budget & costs\n" +
                            "• Visa & passport requirements\n" +
                            "• Packing tips & luggage\n" +
                            "• Local attractions & tours\n" +
                            "• Cultural information\n" +
                            "• Travel safety & insurance\n" +
                            "• Restaurant & food recommendations\n\n" +
                            "If the question is NOT about travel, respond with:\n" +
                            "\"I'm TripWeaver AI, specialized in travel planning only! I can help with destinations, hotels, or itineraries. ✈️\"";
        
        Map<String, Object> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        
        Map<String, Object> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", userMessage);
        
        Map<String, Object> request = new HashMap<>();
        request.put("model", GROQ_MODEL);
        request.put("messages", Arrays.asList(systemMsg, userMsg));
        request.put("temperature", 0.7);
        request.put("max_tokens", 2000);
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            return parseGroqResponse(response.getBody());
            
        } catch (Exception e) {
            throw new RuntimeException("Groq API call failed: " + e.getMessage());
        }
    }
    
    private String parseGroqResponse(Map<String, Object> responseBody) {
        if (responseBody == null) {
            throw new RuntimeException("Empty response from Groq API");
        }
        
        // Check for error
        if (responseBody.containsKey("error")) {
            Map<?, ?> error = (Map<?, ?>) responseBody.get("error");
            String errorMessage = error.get("message").toString();
            throw new RuntimeException("Groq API Error: " + errorMessage);
        }
        
        // Parse the response (OpenAI-compatible format)
        if (responseBody.containsKey("choices")) {
            List<?> choices = (List<?>) responseBody.get("choices");
            
            if (choices == null || choices.isEmpty()) {
                throw new RuntimeException("No choices in response");
            }
            
            Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
            
            if (firstChoice.containsKey("message")) {
                Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
                
                if (message.containsKey("content")) {
                    String text = message.get("content").toString().trim();
                    
                    if (text.isEmpty()) {
                        throw new RuntimeException("Empty response text");
                    }
                    
                    // Log word count for debugging
                    int wordCount = text.split("\\s+").length;
                    System.out.println("📊 Generated response: " + wordCount + " words");
                    
                    return text;
                }
            }
        }
        
        throw new RuntimeException("Unknown response format from Groq");
    }
    
    // Test the API connection
    public Map<String, Object> testConnection() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Test with a simple call to Groq
            String url = "https://api.groq.com/openai/v1/chat/completions";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + groqApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are a travel assistant.");
            
            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", "Hello");
            
            Map<String, Object> request = new HashMap<>();
            request.put("model", GROQ_MODEL);
            request.put("messages", Arrays.asList(systemMsg, userMsg));
            request.put("max_tokens", 100);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            result.put("status", "SUCCESS");
            result.put("statusCode", response.getStatusCodeValue());
            result.put("model", GROQ_MODEL);
            result.put("provider", "Groq");
            
            // Parse the test response
            String reply = parseGroqResponse(response.getBody());
            result.put("response", reply.substring(0, Math.min(100, reply.length())) + "...");
            
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
            result.put("apiKeyLength", groqApiKey != null ? groqApiKey.length() : 0);
        }
        
        return result;
    }
}