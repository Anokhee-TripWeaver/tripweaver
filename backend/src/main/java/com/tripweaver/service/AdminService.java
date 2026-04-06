package com.tripweaver.service;

import com.tripweaver.repository.BookingRepository;
import com.tripweaver.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AdminService {

    @Autowired private UserRepository userRepository;
    @Autowired private BookingRepository bookingRepository;

    public List<?> getAllUsers() { return userRepository.findAll(); }
    public void deleteUser(Long id) { userRepository.deleteById(id); }
    public List<?> getAllBookings() { return bookingRepository.findAll(); }
    public long getUserCount() { return userRepository.count(); }
    public long getBookingCount() { return bookingRepository.count(); }
}
