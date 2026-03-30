package com.tripweaver.service;

import com.tripweaver.model.JoinRequest;
import com.tripweaver.repository.JoinRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class JoinRequestService {

    @Autowired
    private JoinRequestRepository repository;

    public List<JoinRequest> getForHost(String hostIdentity) {
        String key = normalize(hostIdentity);
        if (key.isBlank()) return List.of();
        List<JoinRequest> byEmail = repository.findByHostEmailIgnoreCaseOrderByCreatedAtDesc(key);
        List<JoinRequest> byName = repository.findByHostNameIgnoreCaseOrderByCreatedAtDesc(key);
        return dedupeById(byEmail, byName);
    }

    public List<JoinRequest> getForRequester(String requesterIdentity) {
        String key = normalize(requesterIdentity);
        if (key.isBlank()) return List.of();
        List<JoinRequest> byEmail = repository.findByRequesterEmailIgnoreCaseOrderByCreatedAtDesc(key);
        List<JoinRequest> byName = repository.findByRequesterNameIgnoreCaseOrderByCreatedAtDesc(key);
        return dedupeById(byEmail, byName);
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

    private List<JoinRequest> dedupeById(List<JoinRequest> primary, List<JoinRequest> secondary) {
        Map<Long, JoinRequest> merged = new LinkedHashMap<>();
        for (JoinRequest req : primary) {
            if (req != null && req.getId() != null) merged.put(req.getId(), req);
        }
        for (JoinRequest req : secondary) {
            if (req != null && req.getId() != null) merged.putIfAbsent(req.getId(), req);
        }
        return List.copyOf(merged.values());
    }
}
