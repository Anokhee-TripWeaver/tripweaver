package com.tripweaver.service;

import com.tripweaver.model.CollaborationTrip;
import com.tripweaver.model.JoinRequest;
import com.tripweaver.repository.CollaborationTripRepository;
import com.tripweaver.repository.JoinRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TripChatService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CollaborationTripRepository collaborationTripRepository;

    @Autowired
    private JoinRequestRepository joinRequestRepository;

    public List<Map<String, Object>> getMessages(Long tripId) {
        ensureTripExists(tripId);
        return jdbcTemplate.query("""
                SELECT id, trip_id, sender_name, sender_email, message_text, created_at
                FROM trip_chat_message
                WHERE trip_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (rs, rowNum) -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rs.getLong("id"));
                    item.put("tripId", rs.getLong("trip_id"));
                    item.put("senderName", rs.getString("sender_name"));
                    item.put("senderEmail", rs.getString("sender_email"));
                    item.put("text", rs.getString("message_text"));
                    Timestamp createdAt = rs.getTimestamp("created_at");
                    item.put("createdAt", createdAt == null ? null : createdAt.toLocalDateTime());
                    return item;
                },
                tripId);
    }

    public Map<String, Object> addMessage(Long tripId, Map<String, Object> payload) {
        CollaborationTrip trip = ensureTripExists(tripId);
        String text = trim(payload.get("text"));
        if (text.isBlank()) throw new RuntimeException("text is required");

        String senderEmail = normalize(payload.get("senderEmail"));
        if (senderEmail.isBlank()) throw new RuntimeException("senderEmail is required");

        if (!getAllowedParticipantEmails(tripId, trip).contains(senderEmail)) {
            throw new RuntimeException("Only accepted trip collaborators can send messages");
        }

        String senderName = trim(payload.get("senderName"));
        if (senderName.isBlank()) senderName = "Trip Member";

        LocalDateTime createdAt = LocalDateTime.now();
        jdbcTemplate.update("""
                INSERT INTO trip_chat_message (trip_id, sender_name, sender_email, message_text, created_at)
                VALUES (?, ?, ?, ?, ?)
                """, tripId, senderName, senderEmail, text, Timestamp.valueOf(createdAt));

        Long id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id);
        item.put("tripId", tripId);
        item.put("senderName", senderName);
        item.put("senderEmail", senderEmail);
        item.put("text", text);
        item.put("createdAt", createdAt);
        return item;
    }

    private CollaborationTrip ensureTripExists(Long tripId) {
        return collaborationTripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
    }

    private Set<String> getAllowedParticipantEmails(Long tripId, CollaborationTrip trip) {
        Set<String> emails = new LinkedHashSet<>();
        if (trip != null) emails.add(normalize(trip.getHostEmail()));
        List<JoinRequest> accepted = joinRequestRepository
                .findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(tripId, "ACCEPTED");
        for (JoinRequest req : accepted) emails.add(normalize(req.getRequesterEmail()));
        emails.remove("");
        return emails;
    }

    private String normalize(Object value) {
        return value == null ? "" : value.toString().trim().toLowerCase();
    }

    private String trim(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
