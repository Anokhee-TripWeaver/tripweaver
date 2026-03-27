package com.tripweaver.controller;

import com.tripweaver.model.PackingItemDTO;
import com.tripweaver.service.PackingChecklistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/checklist")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class PackingChecklistController {

    @Autowired
    private PackingChecklistService packingChecklistService;

    /**
     * Get packing checklist for a specific booking
     * GET /api/checklist/{bookingId}
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<List<PackingItemDTO>> getChecklist(@PathVariable Long bookingId) {
        try {
            List<PackingItemDTO> checklist = packingChecklistService.getChecklistByBookingId(bookingId);
            
            // If checklist is empty, it might be an old booking - try to generate it
            if (checklist.isEmpty()) {
                // We need to get the booking to know the destination
                // For now, return empty list - frontend will handle it gracefully
                return ResponseEntity.ok(checklist);
            }
            
            return ResponseEntity.ok(checklist);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Toggle checked status of a packing item
     * PUT /api/checklist/{itemId}/toggle
     */
    @PutMapping("/{itemId}/toggle")
    public ResponseEntity<PackingItemDTO> toggleItem(@PathVariable Long itemId) {
        try {
            PackingItemDTO updated = packingChecklistService.toggleItemChecked(itemId);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Generate checklist for an existing booking (for old bookings without checklists)
     * POST /api/checklist/generate/{bookingId}?destination={destination}
     */
    @PostMapping("/generate/{bookingId}")
    public ResponseEntity<List<PackingItemDTO>> generateChecklist(
            @PathVariable Long bookingId,
            @RequestParam String destination) {
        try {
            List<PackingItemDTO> checklist = packingChecklistService.generateChecklistForBooking(bookingId, destination);
            return ResponseEntity.ok(checklist);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
