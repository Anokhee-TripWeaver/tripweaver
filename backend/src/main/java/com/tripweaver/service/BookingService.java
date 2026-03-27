package com.tripweaver.service;

import com.tripweaver.model.Booking;
import com.tripweaver.model.PopularDestinationDTO;
import com.tripweaver.model.User;
import com.tripweaver.repository.BookingRepository;
import com.tripweaver.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PackingChecklistService packingChecklistService;

    @Transactional
    public Booking createBooking(Booking booking) {
        Booking saved = bookingRepository.save(booking);
        
        // Generate packing checklist automatically
        try {
            packingChecklistService.generateChecklistForBooking(saved.getId(), saved.getDestination());
        } catch (Exception e) {
            System.err.println("Failed to generate packing checklist: " + e.getMessage());
        }
        
        // Determine the email address to send to
        String emailToSend = null;
        
        if (saved.getUsername() != null) {
            if (saved.getUsername().contains("@")) {
                emailToSend = saved.getUsername();
            } else {
                // Try to find the user by username to get the email
                Optional<User> userOpt = userRepository.findByUsername(saved.getUsername());
                if (userOpt.isPresent()) {
                    emailToSend = userOpt.get().getEmail();
                }
            }
        }
        
        if (emailToSend != null && !emailToSend.isEmpty()) {
            // Send payment confirmation email if payment was made
            if (saved.getPaymentId() != null && !saved.getPaymentId().isEmpty()) {
                emailService.sendPaymentConfirmationEmail(
                    emailToSend,
                    saved.getPaymentId(),
                    saved.getPaymentStatus(),
                    saved.getTotalCost()
                );
            }
            
            // Send booking confirmation email
            emailService.sendBookingConfirmation(emailToSend, saved);
        }
        
        return saved;
    }

    public List<Booking> getUserBookings(String username) {
        return bookingRepository.findByUsernameOrderByBookingDateDesc(username);
    }

    /**
     * Get top 4 popular destinations based on booking count
     */
    public List<PopularDestinationDTO> getPopularDestinations() {
        List<Object[]> results = bookingRepository.findPopularDestinations();
        
        return results.stream()
                .limit(4)
                .map(row -> new PopularDestinationDTO(
                    (String) row[0],
                    ((Number) row[1]).longValue()
                ))
                .collect(Collectors.toList());
    }
}
