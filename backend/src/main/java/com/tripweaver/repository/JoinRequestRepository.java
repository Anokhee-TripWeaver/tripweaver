package com.tripweaver.repository;

import com.tripweaver.model.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {
    List<JoinRequest> findByHostEmailIgnoreCaseOrderByCreatedAtDesc(String hostEmail);
    List<JoinRequest> findByRequesterEmailIgnoreCaseOrderByCreatedAtDesc(String requesterEmail);
    List<JoinRequest> findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(Long postId, String status);
    Optional<JoinRequest> findFirstByPostIdAndHostEmailIgnoreCaseAndRequesterEmailIgnoreCaseAndStatusIgnoreCase(
            Long postId, String hostEmail, String requesterEmail, String status
    );
}
