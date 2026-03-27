package com.tripweaver.repository;

import com.tripweaver.model.PackingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PackingItemRepository extends JpaRepository<PackingItem, Long> {
    List<PackingItem> findByBookingId(Long bookingId);
    void deleteByBookingId(Long bookingId);
}
