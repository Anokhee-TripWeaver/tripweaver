package com.tripweaver.service;

import com.tripweaver.model.JoinRequest;
import com.tripweaver.repository.JoinRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class JoinRequestService {

    @Autowired
    private JoinRequestRepository repository;

    public List<JoinRequest> getForHost(String hostEmail) {
        return repository.findByHostEmailIgnoreCaseOrderByCreatedAtDesc(hostEmail);
    }

    public List<JoinRequest> getForRequester(String requesterEmail) {
        return repository.findByRequesterEmailIgnoreCaseOrderByCreatedAtDesc(requesterEmail);
    }

    public JoinRequest create(JoinRequest request) {
        String hostEmail = normalize(request.getHostEmail());
        String requesterEmail = normalize(request.getRequesterEmail());
        Long postId = request.getPostId();

        if (postId != null && !hostEmail.isBlank() && !requesterEmail.isBlank()) {
            Optional<JoinRequest> existing = repository
                    .findFirstByPostIdAndHostEmailIgnoreCaseAndRequesterEmailIgnoreCaseAndStatusIgnoreCase(
                            postId, hostEmail, requesterEmail, "PENDING"
                    );
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        request.setHostEmail(hostEmail);
        request.setRequesterEmail(requesterEmail);
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            request.setStatus("PENDING");
        }
        LocalDateTime now = LocalDateTime.now();
        request.setCreatedAt(now);
        request.setUpdatedAt(now);
        return repository.save(request);
    }

    public JoinRequest updateStatus(Long id, String status) {
        JoinRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Join request not found"));
        req.setStatus((status == null || status.isBlank()) ? req.getStatus() : status.toUpperCase());
        req.setUpdatedAt(LocalDateTime.now());
        return repository.save(req);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}

