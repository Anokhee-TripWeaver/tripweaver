package com.tripweaver.chatbot;

import com.tripweaver.service.EmailService;
import com.tripweaver.service.JoinRequestService;
import com.tripweaver.model.JoinRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*", allowCredentials = "false")
public class AgentController {

    @Autowired
    private AgentService agentService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JoinRequestService joinRequestService;

    /**
     * Main agent endpoint - detects intent and returns action + reply
     * Body: { message, context: { page, trips: [...], user: {...} } }
     */
    @PostMapping("/agent")
    public ResponseEntity<?> agent(@RequestBody Map<String, Object> body) {
        String message = (String) body.get("message");
        @SuppressWarnings("unchecked")
        Map<String, Object> context = (Map<String, Object>) body.getOrDefault("context", Map.of());

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is empty"));
        }

        try {
            AgentService.AgentResponse response = agentService.process(message, context);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Send itinerary/trip info to an email address
     * Body: { toEmail, subject, content }
     */
    @PostMapping("/agent/send-email")
    public ResponseEntity<?> sendEmail(@RequestBody Map<String, String> body) {
        String toEmail = body.get("toEmail");
        String subject = body.get("subject");
        String content = body.get("content");

        if (toEmail == null || !toEmail.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid email address"));
        }

        try {
            emailService.sendAgentEmail(toEmail, subject != null ? subject : "TripWeaver - Your Travel Info", content);
            return ResponseEntity.ok(Map.of("message", "Email sent to " + toEmail));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to send email: " + e.getMessage()));
        }
    }

    /**
     * Submit a join request for an open trip via agent
     */
    @PostMapping("/agent/join-trip")
    public ResponseEntity<?> joinTrip(@RequestBody JoinRequest request) {
        try {
            JoinRequest saved = joinRequestService.create(request);
            return ResponseEntity.ok(Map.of(
                "message", "Join request sent for trip to " + saved.getDestination(),
                "requestId", saved.getId()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to send join request: " + e.getMessage()));
        }
    }
}
