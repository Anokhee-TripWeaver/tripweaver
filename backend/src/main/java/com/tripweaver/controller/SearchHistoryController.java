package com.tripweaver.controller;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.util.SecurityUtil;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/search-history")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        },
        allowCredentials = "true"
)
public class SearchHistoryController {

    private final SearchHistoryService service;

    public SearchHistoryController(SearchHistoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<SearchHistory> getMyHistory(
            Principal principal,
            @RequestParam(name = "email", required = false) String emailParam
    ) {
        String email = SecurityUtil.getEmail(principal);
        if (email == null || email.isBlank()) {
            email = (emailParam == null ? "" : emailParam.trim().toLowerCase());
        }
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return service.getUserHistory(email);
    }
}
