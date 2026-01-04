package com.tripweaver.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tripweaver.service.OpenAIService;

@RestController
@RequestMapping("/api/openai")
public class OpenAIController {

    @Autowired
    private OpenAIService openAIService;

    @PostMapping("/generate")
    public ResponseEntity<String> generateItinerary(@RequestBody Map<String, String> payload) {
        String destination = payload.get("destination");
        String startDate = payload.get("startDate");
        String endDate = payload.get("endDate");

        if (destination == null || startDate == null || endDate == null) {
            return ResponseEntity.badRequest().body("Missing required fields: destination, startDate, endDate");
        }

        String itinerary = openAIService.generateItinerary(destination, startDate, endDate);
        return ResponseEntity.ok(itinerary);
    }
}
