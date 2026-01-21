package com.tripweaver.controller;

import java.security.Principal;

import com.tripweaver.model.SavedTrip;
import com.tripweaver.model.TripResponse;
import com.tripweaver.service.TripService;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.util.SecurityUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trip")
public class TripController {

    @Autowired
    private TripService tripService;

    @Autowired
    private SearchHistoryService historyService;

    @PostMapping("/save")
    public SavedTrip saveTrip(@RequestBody SavedTrip trip) {
        return tripService.saveTrip(trip);
    }

    @GetMapping("/saved")
    public java.util.List<SavedTrip> getSavedTrips(@RequestParam String username) {
        return tripService.getSavedTripsByUsername(username);
    }

    @DeleteMapping("/saved/{id}")
    public ResponseEntity<Void> deleteSavedTrip(
            @PathVariable Long id,
            @RequestParam String username
    ) {
        tripService.deleteSavedTrip(id, username);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public TripResponse searchTrip(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam String date,
            @RequestParam(required = false) Double budget,
            Principal principal
    ) {
        String email = SecurityUtil.getEmail(principal);

        // ✅ SAVE TRIP SEARCH
        if (email != null) {
            historyService.save(
                    email,
                    origin + " → " + destination,
                    date,
                    "TRIP"
            );
        }

        return tripService.getTripData(origin, destination, date, budget);
    }
}
