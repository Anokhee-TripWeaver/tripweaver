package com.tripweaver.controller;

import com.tripweaver.service.OpenTripSplitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/open-trip-splits")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        },
        allowCredentials = "true"
)
public class OpenTripSplitController {

    @Autowired
    private OpenTripSplitService service;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam String ownerId) {
        return ResponseEntity.ok(Map.of("entries", service.listByOwner(ownerId)));
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody Map<String, Object> body) {
        String ownerId = string(body.get("ownerId"));
        String postKey = string(body.get("postKey"));
        Object data = body.getOrDefault("data", new HashMap<>());
        Object form = body.getOrDefault("form", new HashMap<>());
        Object memberForm = body.getOrDefault("memberForm", new HashMap<>());

        var saved = service.upsert(ownerId, postKey, data, form, memberForm);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "updatedAt", saved.getUpdatedAt()
        ));
    }

    private String string(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
