package com.tripweaver.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripweaver.model.OpenTripSplit;
import com.tripweaver.repository.OpenTripSplitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OpenTripSplitService {

    @Autowired
    private OpenTripSplitRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private void ensureTableExists() {
        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS open_trip_split (
                  id BIGINT AUTO_INCREMENT PRIMARY KEY,
                  owner_id VARCHAR(255) NOT NULL,
                  post_key VARCHAR(255) NOT NULL,
                  data_json LONGTEXT,
                  form_json LONGTEXT,
                  member_form_json LONGTEXT,
                  updated_at DATETIME,
                  UNIQUE KEY uk_owner_post (owner_id, post_key)
                )
            """);
        } catch (Exception ignored) {
            // If creation fails, repository operations will surface the error; we avoid throwing here to keep behavior unchanged.
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize split payload");
        }
    }

    @Transactional
    public OpenTripSplit upsert(String ownerId, String postKey, Object data, Object form, Object memberForm) {
        ensureTableExists();
        if (ownerId == null || ownerId.isBlank()) {
            throw new RuntimeException("ownerId is required");
        }
        if (postKey == null || postKey.isBlank()) {
            throw new RuntimeException("postKey is required");
        }

        OpenTripSplit entity = repository.findByOwnerIdAndPostKey(ownerId.trim().toLowerCase(), postKey)
                .orElseGet(OpenTripSplit::new);
        entity.setOwnerId(ownerId.trim().toLowerCase());
        entity.setPostKey(postKey);
        entity.setDataJson(toJson(data == null ? new HashMap<>() : data));
        entity.setFormJson(toJson(form == null ? new HashMap<>() : form));
        entity.setMemberFormJson(toJson(memberForm == null ? new HashMap<>() : memberForm));
        entity.setUpdatedAt(LocalDateTime.now());
        return repository.save(entity);
    }

    public List<Map<String, Object>> listByOwner(String ownerId) {
        ensureTableExists();
        if (ownerId == null || ownerId.isBlank()) return List.of();
        return repository.findByOwnerId(ownerId.trim().toLowerCase())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private Map<String, Object> toDto(OpenTripSplit entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("postKey", entity.getPostKey());
        map.put("updatedAt", entity.getUpdatedAt());
        map.put("data", parseJson(entity.getDataJson()));
        map.put("form", parseJson(entity.getFormJson()));
        map.put("memberForm", parseJson(entity.getMemberFormJson()));
        return map;
    }

    @SuppressWarnings("unchecked")
    private Object parseJson(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception ex) {
            return new HashMap<>();
        }
    }
}
