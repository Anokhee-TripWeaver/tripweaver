package com.tripweaver.service;

import com.tripweaver.model.Booking;
import com.tripweaver.model.User;
import com.tripweaver.repository.BookingRepository;
import com.tripweaver.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    public Booking createBooking(Booking booking) {
        Booking saved = bookingRepository.save(booking);
        
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
        
        System.out.println("Booking Created. Username: " + saved.getUsername() + ", Resolved Email: " + emailToSend);

        if (emailToSend != null && !emailToSend.isEmpty()) {
            emailService.sendBookingConfirmation(emailToSend, saved);
        } else {
            System.out.println("No email address found for user: " + saved.getUsername() + ". Skipping email confirmation.");
        }
        
        return saved;
    }

    public List<Booking> getUserBookings(String username) {
        return bookingRepository.findByUsernameOrderByBookingDateDesc(username);
    }
}
