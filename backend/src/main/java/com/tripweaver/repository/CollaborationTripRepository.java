package com.tripweaver.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.tripweaver.model.CollaborationTrip;
import java.util.Optional;

public interface CollaborationTripRepository 
        extends JpaRepository<CollaborationTrip, Long> {

    Optional<CollaborationTrip> findFirstByHostEmailIgnoreCaseAndDestinationIgnoreCaseAndStartDateAndEndDate(
        String hostEmail, String destination, String startDate, String endDate
    );
}
