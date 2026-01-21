package com.tripweaver.controller;

import java.util.Map;
import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tripweaver.service.GeminiService;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.util.SecurityUtil;

@RestController
@RequestMapping("/api/gemini")
public class GeminiController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private SearchHistoryService historyService;

    @PostMapping("/generate")
    public ResponseEntity<String> generateItinerary(
            @RequestBody Map<String, String> payload,
            Principal principal
    ) {
        String destination = payload.get("destination");
        String startDate = payload.get("startDate");
        String endDate = payload.get("endDate");

        if (destination == null || startDate == null || endDate == null) {
            return ResponseEntity.badRequest()
                    .body("Missing required fields: destination, startDate, endDate");
        }

        // Validate Dates
        try {
            var start = java.time.LocalDate.parse(startDate);
            var end = java.time.LocalDate.parse(endDate);
            if (end.isBefore(start)) {
                return ResponseEntity.badRequest()
                        .body("End date cannot be before start date.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Invalid date format. Use YYYY-MM-DD.");
        }

        // ✅ SAVE ITINERARY HISTORY (OAuth + Manual)
        String email = SecurityUtil.getEmail(principal);
        if (email != null) {
            historyService.save(
                    email,
                    destination + " (" + startDate + " → " + endDate + ")",
                    "itinerary",
                    "ITINERARY"
            );
        }

        return ResponseEntity.ok(
                geminiService.generateItinerary(destination, startDate, endDate)
        );
    }
}
