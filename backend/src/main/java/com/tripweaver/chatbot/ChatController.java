package com.tripweaver.chatbot;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/message")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> body) {
        String message = body.get("message");
        
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is empty"));
        }
        
        try {
            String reply = chatService.getReply(message);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Service unavailable: " + e.getMessage()));
        }
    }
    
    @GetMapping("/test")
    public ResponseEntity<?> test() {
        try {
            String response = chatService.getReply("Best beaches in Thailand?");
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "response", response,
                "wordCount", response.split("\\s+").length
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", e.getMessage()));
        }
    }
}