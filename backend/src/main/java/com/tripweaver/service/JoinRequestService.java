package com.tripweaver.service;

import com.tripweaver.model.JoinRequest;
import com.tripweaver.repository.JoinRequestRepository;
import com.tripweaver.repository.CollaborationTripRepository;
import com.tripweaver.repository.SavedTripRepository;
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

    @Autowired
    private EmailService emailService;

    @Autowired
    private CollaborationTripRepository tripRepository;

    @Autowired
    private SavedTripRepository savedTripRepository;

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

        // Fetch price from the actual trip to ensure it's NEVER zero
        if (postId != null) {
            tripRepository.findById(postId).ifPresent(trip -> {
                request.setPricePerPerson(trip.getPricePerPerson());
            });
        }

        // Final fallback: if price is still null/0, try to find it in SavedTrip
        if (request.getPricePerPerson() == null || request.getPricePerPerson() <= 0) {
            savedTripRepository.findFirstByEmailIgnoreCaseAndDestinationIgnoreCaseAndStartDateAndEndDateAndOpenTripTrueOrderByCreatedAtDesc(
                hostEmail, request.getDestination(), request.getStartDate(), request.getEndDate()
            ).ifPresent(saved -> {
                request.setPricePerPerson(saved.getTotalCost() / (saved.getSeatsAvailable() + 1));
            });
        }

        if (postId != null && !requesterEmail.isBlank()) {
            Optional<JoinRequest> existing = repository.findByPostIdAndRequesterEmail(postId, requesterEmail);
            if (existing.isPresent()) {
                throw new IllegalStateException("You have already sent a request to join this trip.");
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
        
        JoinRequest saved = repository.save(request);

        // Send email to host
        try {
            emailService.sendJoinRequestEmail(
                saved.getHostEmail(),
                saved.getHostName(),
                saved.getRequesterName(),
                saved.getRequesterEmail(),
                saved.getDestination(),
                saved.getStartDate(),
                saved.getEndDate()
            );
        } catch (Exception e) {
            System.err.println("Failed to send join request email: " + e.getMessage());
        }

        return saved;
    }

    public JoinRequest updateStatus(Long id, String status) {
        JoinRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Join request not found"));
        
        String oldStatus = req.getStatus();
        String newStatus = (status == null || status.isBlank()) ? req.getStatus() : status.toUpperCase();
        
        req.setStatus(newStatus);
        req.setUpdatedAt(LocalDateTime.now());
        JoinRequest saved = repository.save(req);

        // Send email if status changed to ACCEPTED
        if ("ACCEPTED".equalsIgnoreCase(newStatus) && !"ACCEPTED".equalsIgnoreCase(oldStatus)) {
            try {
                emailService.sendJoinAcceptedEmail(
                    saved.getRequesterEmail(),
                    saved.getRequesterName(),
                    saved.getHostName(),
                    saved.getDestination(),
                    saved.getStartDate(),
                    saved.getEndDate()
                );
            } catch (Exception e) {
                System.err.println("Failed to send join acceptance email: " + e.getMessage());
            }
        }

        return saved;
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
