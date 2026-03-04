package com.tripweaver.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.tripweaver.model.CollaborationTrip;

public interface CollaborationTripRepository 
        extends JpaRepository<CollaborationTrip, Long> {
}