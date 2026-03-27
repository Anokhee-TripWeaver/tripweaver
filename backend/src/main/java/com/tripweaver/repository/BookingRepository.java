package com.tripweaver.repository;

import com.tripweaver.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUsernameOrderByBookingDateDesc(String username);
    
    @Query("SELECT b.destination as destination, COUNT(b) as count " +
           "FROM Booking b " +
           "WHERE b.status = 'CONFIRMED' " +
           "GROUP BY b.destination " +
           "ORDER BY COUNT(b) DESC")
    List<Object[]> findPopularDestinations();
}
