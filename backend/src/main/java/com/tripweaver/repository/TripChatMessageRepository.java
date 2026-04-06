package com.tripweaver.repository;

import com.tripweaver.model.TripChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TripChatMessageRepository extends JpaRepository<TripChatMessage, Long> {
    List<TripChatMessage> findByTripIdOrderByCreatedAtAsc(Long tripId);
}
