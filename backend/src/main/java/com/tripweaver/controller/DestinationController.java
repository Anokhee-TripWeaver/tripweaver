package com.tripweaver.controller;

import java.util.List;
import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tripweaver.model.Destination;
import com.tripweaver.model.PopularDestinationDTO;
import com.tripweaver.service.BookingService;
import com.tripweaver.service.DestinationService;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.util.SecurityUtil;

@RestController
@RequestMapping("/api/destination")
public class DestinationController {

    @Autowired
    private DestinationService destinationService;

    @Autowired
    private SearchHistoryService historyService;

    @Autowired
    private BookingService bookingService;

    @GetMapping("/search/google")
    public List<Destination> searchGoogle(
            @RequestParam String query,
            @RequestParam(defaultValue = "accommodation") String category,
            Principal principal
    ) {
        String email = SecurityUtil.getEmail(principal);

        // ✅ SAVE DESTINATION SEARCH
        if (email != null) {
            historyService.save(email, query, category, "DESTINATION");
        }

        return destinationService.searchDestinationsGoogle(query, category);
    }

    @GetMapping("/search/all")
    public List<Destination> searchAll(
            @RequestParam String query,
            Principal principal
    ) {
        String email = SecurityUtil.getEmail(principal);

        if (email != null) {
            historyService.save(email, query, "all", "DESTINATION");
        }

        return destinationService.searchAllGoogle(query);
    }

    @GetMapping("/photos/{placeId}")
    public List<String> getPhotos(@PathVariable String placeId) {
        return destinationService.getPlacePhotosLegacy(placeId);
    }

    /**
     * Get top 4 popular destinations based on booking count
     * GET /api/destination/popular
     */
    @GetMapping("/popular")
    public ResponseEntity<List<PopularDestinationDTO>> getPopularDestinations() {
        try {
            List<PopularDestinationDTO> popularDestinations = bookingService.getPopularDestinations();
            return ResponseEntity.ok(popularDestinations);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
