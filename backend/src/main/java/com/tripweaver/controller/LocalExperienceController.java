package com.tripweaver.controller;

import com.tripweaver.service.AmadeusExperienceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/experiences")
@CrossOrigin(origins = "*")
public class LocalExperienceController {

    @Autowired
    private AmadeusExperienceService amadeusExperienceService;

    /**
     * Get experiences by destination using Amadeus API
     * GET /api/experiences/{destination}
     * Example: /api/experiences/goa
     */
    @GetMapping("/{destination}")
    public ResponseEntity<List<Map<String, Object>>> getExperiencesByDestination(
            @PathVariable String destination
    ) {
        try {
            List<Map<String, Object>> experiences = amadeusExperienceService.getExperiencesWithFallback(destination);
            return ResponseEntity.ok(experiences);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
