package com.tripweaver.controller;

import java.security.Principal;
import java.util.List;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tripweaver.model.CollaborationTrip;
import com.tripweaver.model.SavedTrip;
import com.tripweaver.model.TripResponse;
import com.tripweaver.service.CollaborationTripService;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.service.TripService;
import com.tripweaver.util.SecurityUtil;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        },
        allowCredentials = "true"
)
public class TripController {

    @Autowired
    private TripService tripService;

    @Autowired
    private SearchHistoryService historyService;

    @Autowired
    private CollaborationTripService collaborationTripService;

    @PostMapping("/save")
    public SavedTrip saveTrip(@RequestBody SavedTrip trip) {

        SavedTrip savedTrip = tripService.saveTrip(trip);

        if (Boolean.TRUE.equals(trip.getOpenTrip())) {
            CollaborationTrip openTrip = new CollaborationTrip();
            openTrip.setDestination(trip.getDestination());
            openTrip.setStartDate(trip.getStartDate());
            openTrip.setEndDate(trip.getEndDate());
            openTrip.setHostName(trip.getUsername());
            openTrip.setHostEmail(trip.getEmail());
            openTrip.setSeatsAvailable(trip.getSeatsAvailable());
            openTrip.setTotalCost(trip.getTotalCost());
            openTrip.setNote(trip.getNote());
            openTrip.setFlightDetails(trip.getFlightDetails());
            openTrip.setReturnFlightDetails(trip.getReturnFlightDetails());
            openTrip.setHotelDetails(trip.getHotelDetails());

            collaborationTripService.saveTrip(openTrip);
        }

        return savedTrip;
    }

    @GetMapping("/saved")
    public List<SavedTrip> getSavedTrips(@RequestParam String username) {
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
        try {
            String email = SecurityUtil.getEmail(principal);
            if (email != null) {
                historyService.save(
                        email,
                        origin + " -> " + destination,
                        date,
                        "TRIP"
                );
            }
        } catch (Exception e) {
            System.err.println("Trip history save skipped: " + e.getMessage());
        }

        try {
            return tripService.getTripData(origin, destination, date, budget);
        } catch (Exception e) {
            System.err.println("Trip search failed hard, returning empty response: " + e.getMessage());
            TripResponse fallback = new TripResponse();
            fallback.setFlights(new ArrayList<>());
            fallback.setHotels(new ArrayList<>());
            return fallback;
        }
    }
}
