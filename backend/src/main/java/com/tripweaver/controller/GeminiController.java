package com.tripweaver.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tripweaver.service.GeminiService;

@RestController
@RequestMapping("/api/gemini")
public class GeminiController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/generate")
    public ResponseEntity<String> generateItinerary(@RequestBody Map<String, String> payload) {
        String destination = payload.get("destination");
        String startDate = payload.get("startDate");
        String endDate = payload.get("endDate");

        if (destination == null || startDate == null || endDate == null) {
            return ResponseEntity.badRequest().body("Missing required fields: destination, startDate, endDate");
        }

        // Validate Dates
        try {
            java.time.LocalDate start = java.time.LocalDate.parse(startDate);
            java.time.LocalDate end = java.time.LocalDate.parse(endDate);
            if (end.isBefore(start)) {
                 return ResponseEntity.badRequest().body("End date cannot be before start date.");
            }
        } catch (Exception e) {
             return ResponseEntity.badRequest().body("Invalid date format. Use YYYY-MM-DD.");
        }

        String itinerary = geminiService.generateItinerary(destination, startDate, endDate);
        return ResponseEntity.ok(itinerary);
    }
}
