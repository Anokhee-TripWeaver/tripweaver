package com.tripweaver.repository;

import com.tripweaver.model.SavedTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SavedTripRepository extends JpaRepository<SavedTrip, Long> {
    java.util.List<SavedTrip> findByUsername(String username);
    void deleteByIdAndUsername(Long id, String username);
}
