package com.tripweaver.chatbot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AgentService {

    @Value("${chatbot.groq.key}")
    private String groqApiKey;

    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    private final RestTemplate restTemplate = new RestTemplate();

    public static class AgentResponse {
        public String reply;
        public String action;       // "send_email" | "join_trip" | "navigate" | null
        public Map<String, Object> actionData;

        public AgentResponse(String reply, String action, Map<String, Object> actionData) {
            this.reply = reply;
            this.action = action;
            this.actionData = actionData;
        }
    }

    public AgentResponse process(String userMessage, Map<String, Object> context) {
        String contextSummary = buildContextSummary(context);
        String systemPrompt = buildSystemPrompt(contextSummary);

        String rawReply = callGroq(systemPrompt, userMessage);

        // Parse structured response from LLM
        return parseAgentReply(rawReply, context);
    }

    private String buildContextSummary(Map<String, Object> context) {
        if (context == null || context.isEmpty()) return "No page context available.";

        StringBuilder sb = new StringBuilder();
        String page = (String) context.getOrDefault("page", "unknown");
        sb.append("Current page: ").append(page).append("\n");

        @SuppressWarnings("unchecked")
        Map<String, Object> user = (Map<String, Object>) context.get("user");
        if (user != null) {
            sb.append("Logged in user: ").append(user.getOrDefault("username", "unknown"))
              .append(" (email: ").append(user.getOrDefault("email", "unknown")).append(")\n");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> trips = (List<Map<String, Object>>) context.get("trips");
        if (trips != null && !trips.isEmpty()) {
            sb.append("Visible trips on screen:\n");
            for (int i = 0; i < Math.min(trips.size(), 5); i++) {
                Map<String, Object> t = trips.get(i);
                sb.append("  Trip ").append(i + 1).append(": ")
                  .append(t.getOrDefault("origin", "?")).append(" → ")
                  .append(t.getOrDefault("destination", "?"))
                  .append(", Dates: ").append(t.getOrDefault("startDate", "?"))
                  .append(" to ").append(t.getOrDefault("endDate", "?"))
                  .append(", Price/person: ₹").append(t.getOrDefault("pricePerPerson", "?"))
                  .append(", Host: ").append(t.getOrDefault("hostEmail", "?"))
                  .append(", ID: ").append(t.getOrDefault("id", "?"))
                  .append("\n");
            }
        }

        return sb.toString();
    }

    private String buildSystemPrompt(String contextSummary) {
        return "You are TripWeaver AI Agent — a smart travel assistant that can TAKE ACTIONS, not just answer questions.\n\n" +
               "CURRENT CONTEXT:\n" + contextSummary + "\n\n" +
               "YOU CAN PERFORM THESE ACTIONS by including a special tag in your reply:\n\n" +
               "1. SEND EMAIL: If user says 'email me', 'send this to my email', 'mail me this info' etc.\n" +
               "   Include at end of reply: [ACTION:send_email|to:{email}|subject:{subject}]\n" +
               "   Extract email from user message or use logged-in user's email.\n\n" +
               "2. JOIN TRIP: If user says 'join this trip', 'book trip 1', 'request to join', 'I want to join trip to X' etc.\n" +
               "   Include at end of reply: [ACTION:join_trip|tripId:{id}|destination:{dest}]\n" +
               "   Use the trip details from context. Only do this if user is logged in.\n\n" +
               "3. SUGGEST NAVIGATION: After answering ANY question about a specific place, you MUST add a suggestion button.\n" +
               "   ALWAYS add this tag at the end when user asks about tourist spots, hotels, restaurants, flights, bookings:\n" +
               "   [ACTION:suggest|label:🔍 Show tourist spots in Delhi|path:/search?query=Delhi&category=tourist_attraction]\n" +
               "   [ACTION:suggest|label:🏨 Show hotels in Mumbai|path:/search?query=Mumbai&category=accommodation]\n" +
               "   [ACTION:suggest|label:🍽️ Show restaurants in Goa|path:/search?query=Goa&category=restaurant]\n" +
               "   [ACTION:suggest|label:✈️ Search flights to Delhi|path:/trips|destination:Delhi|origin:HYD|budget:20000|startDate:2026-04-01|endDate:2026-04-04]\n" +
               "   [ACTION:suggest|label:📋 View my bookings|path:/bookings]\n" +
               "   [ACTION:suggest|label:🗺️ Plan itinerary|path:/planner]\n" +
               "   Rules for suggest tags:\n" +
               "   - Replace city/destination with the actual place mentioned by user\n" +
               "   - For tourist spots use category=tourist_attraction\n" +
               "   - For hotels use category=accommodation\n" +
               "   - For restaurants use category=restaurant\n" +
               "   - ALWAYS include at least one suggest tag when a specific destination is mentioned\n" +
               "   - Put suggest tags on separate lines at the very end\n\n" +
               "4. NO ACTION: For regular travel questions, just answer normally without any action tag.\n\n" +
               "4. NO ACTION: For regular travel questions, just answer normally without any action tag.\n\n" +
               "RULES:\n" +
               "- Only answer travel-related questions\n" +
               "- Be detailed and informative - give at least 4-6 sentences with specific facts, tips, and recommendations\n" +
               "- If user asks about a destination, mention top attractions, best time to visit, local food, and travel tips\n" +
               "- If user asks about hotels/restaurants, give specific names and what makes them special\n" +
               "- Be friendly and enthusiastic about travel\n" +
               "- If user wants to join a trip but isn't logged in, tell them to log in first\n" +
               "- If user says 'email me' without specifying an address, use their logged-in email\n" +
               "- Do NOT add lines like 'I'll send this to your email' - just do it silently\n" +
               "- Put all [ACTION:suggest|...] tags on separate lines at the very end after your full answer";
    }

    private String callGroq(String systemPrompt, String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + groqApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> sysMsg = Map.of("role", "system", "content", systemPrompt);
        Map<String, Object> userMsg = Map.of("role", "user", "content", userMessage);

        Map<String, Object> request = new HashMap<>();
        request.put("model", GROQ_MODEL);
        request.put("messages", List.of(sysMsg, userMsg));
        request.put("temperature", 0.5);
        request.put("max_tokens", 1200);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_URL, entity, Map.class);

        List<?> choices = (List<?>) response.getBody().get("choices");
        Map<?, ?> first = (Map<?, ?>) choices.get(0);
        Map<?, ?> msg = (Map<?, ?>) first.get("message");
        return msg.get("content").toString().trim();
    }

    private AgentResponse parseAgentReply(String raw, Map<String, Object> context) {
        // Find all [ACTION:...] tags
        int actionStart = raw.lastIndexOf("[ACTION:");
        if (actionStart == -1) {
            return new AgentResponse(raw, null, null);
        }

        // Check if it's a suggest - collect ALL suggest tags
        String remaining = raw;
        List<Map<String, Object>> suggests = new java.util.ArrayList<>();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\[ACTION:suggest\\|([^\\]]+)\\]");
        java.util.regex.Matcher m = p.matcher(raw);
        while (m.find()) {
            String[] parts = m.group(1).split("\\|");
            Map<String, Object> sd = new HashMap<>();
            for (String part : parts) {
                String[] kv = part.split(":", 2);
                if (kv.length == 2) sd.put(kv[0].trim(), kv[1].trim());
            }
            suggests.add(sd);
            remaining = remaining.replace(m.group(0), "").trim();
        }

        if (!suggests.isEmpty()) {
            Map<String, Object> actionData = new HashMap<>();
            actionData.put("suggests", suggests);
            return new AgentResponse(remaining, "suggest", actionData);
        }

        // Handle other action types (send_email, join_trip)
        int actionEnd = raw.indexOf("]", actionStart);
        if (actionEnd == -1) return new AgentResponse(raw, null, null);

        String actionTag = raw.substring(actionStart + 1, actionEnd);
        String replyText = raw.substring(0, actionStart).trim();
        String[] parts = actionTag.split("\\|");
        String actionType = parts[0].replace("ACTION:", "").trim();

        Map<String, Object> actionData = new HashMap<>();
        for (int i = 1; i < parts.length; i++) {
            String[] kv = parts[i].split(":", 2);
            if (kv.length == 2) actionData.put(kv[0].trim(), kv[1].trim());
        }

        if ("join_trip".equals(actionType)) enrichJoinTripData(actionData, context);

        return new AgentResponse(replyText, actionType, actionData);
    }

    @SuppressWarnings("unchecked")
    private void enrichJoinTripData(Map<String, Object> actionData, Map<String, Object> context) {
        String tripIdStr = (String) actionData.get("tripId");
        List<Map<String, Object>> trips = (List<Map<String, Object>>) context.get("trips");
        Map<String, Object> user = (Map<String, Object>) context.get("user");

        if (trips == null || trips.isEmpty()) return;

        Map<String, Object> matchedTrip = null;

        // Try to match by ID
        if (tripIdStr != null && !tripIdStr.isBlank()) {
            for (Map<String, Object> t : trips) {
                if (tripIdStr.equals(String.valueOf(t.get("id")))) {
                    matchedTrip = t;
                    break;
                }
            }
        }

        // Fallback: match by destination name
        if (matchedTrip == null) {
            String dest = (String) actionData.get("destination");
            if (dest != null) {
                for (Map<String, Object> t : trips) {
                    String tripDest = (String) t.get("destination");
                    if (tripDest != null && tripDest.toLowerCase().contains(dest.toLowerCase())) {
                        matchedTrip = t;
                        break;
                    }
                }
            }
        }

        // Fallback: just use first trip
        if (matchedTrip == null) matchedTrip = trips.get(0);

        actionData.put("tripId", matchedTrip.get("id"));
        actionData.put("destination", matchedTrip.get("destination"));
        actionData.put("startDate", matchedTrip.get("startDate"));
        actionData.put("endDate", matchedTrip.get("endDate"));
        actionData.put("hostEmail", matchedTrip.get("hostEmail"));
        actionData.put("hostName", matchedTrip.getOrDefault("hostName", matchedTrip.get("hostEmail")));
        actionData.put("pricePerPerson", matchedTrip.get("pricePerPerson"));

        if (user != null) {
            actionData.put("requesterEmail", user.get("email"));
            actionData.put("requesterName", user.get("username"));
        }
    }
}
