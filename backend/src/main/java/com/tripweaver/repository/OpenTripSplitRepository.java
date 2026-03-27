package com.tripweaver.repository;

import com.tripweaver.model.OpenTripSplit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OpenTripSplitRepository extends JpaRepository<OpenTripSplit, Long> {
    List<OpenTripSplit> findByOwnerId(String ownerId);
    Optional<OpenTripSplit> findByOwnerIdAndPostKey(String ownerId, String postKey);
}
