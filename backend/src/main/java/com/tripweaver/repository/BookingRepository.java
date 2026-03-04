package com.tripweaver.repository;

import com.tripweaver.model.Booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUsernameOrderByBookingDateDesc(String username);
}
