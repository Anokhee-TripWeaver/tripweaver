package com.tripweaver.repository;

import com.tripweaver.model.TripBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TripBookingRepository extends JpaRepository<TripBooking, Long> {
    List<TripBooking> findByTripId(Long tripId);
}
