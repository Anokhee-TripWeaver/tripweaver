package com.tripweaver.controller;

import com.tripweaver.model.Booking;
import com.tripweaver.service.BookingService;
import com.tripweaver.service.EmailService;
import com.tripweaver.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private EmailService emailService;

    @PostMapping("/create")
    public ResponseEntity<Booking> createBooking(@RequestBody Booking booking, Principal principal) {
        // Always prioritize Principal if available to ensure we use the correct identifier (Email)
        if (principal != null) {
            String email = SecurityUtil.getEmail(principal);
            if (email != null) {
                booking.setUsername(email);
            } else {
                booking.setUsername(principal.getName());
            }
        }
        Booking saved = bookingService.createBooking(booking);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<List<Booking>> getMyBookings(Principal principal, @RequestParam(required = false) String username) {
        String finalUsername = null;
        if (principal != null) {
            String email = SecurityUtil.getEmail(principal);
             if (email != null) {
                finalUsername = email;
            } else {
                finalUsername = principal.getName();
            }
        }
        
        if (finalUsername == null && username != null) {
            finalUsername = username;
        }
        
        if (finalUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(bookingService.getUserBookings(finalUsername));
    }
}
