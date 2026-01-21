package com.tripweaver.controller;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.util.SecurityUtil;

import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/search-history")
public class SearchHistoryController {

    private final SearchHistoryService service;

    public SearchHistoryController(SearchHistoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<SearchHistory> getMyHistory(Principal principal) {
        String email = SecurityUtil.getEmail(principal);
        return service.getUserHistory(email);
    }
}
