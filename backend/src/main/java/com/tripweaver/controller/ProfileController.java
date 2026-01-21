package com.tripweaver.controller;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.service.SearchHistoryService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final SearchHistoryService historyService;

    public ProfileController(SearchHistoryService historyService) {
        this.historyService = historyService;
    }

    // ✅ PROFILE + HISTORY
    @GetMapping
    public Map<String, Object> getProfile(
            @AuthenticationPrincipal OAuth2User user) {

        Map<String, Object> res = new HashMap<>();

        // 🔐 Safety check (important)
        if (user == null) {
            res.put("loggedIn", false);
            return res;
        }

        String email = user.getAttribute("email");

        res.put("name", user.getAttribute("name"));
        res.put("email", email);
        res.put("picture", user.getAttribute("picture"));

        List<SearchHistory> history =
                historyService.getUserHistory(email);
        res.put("history", history);

        return res;
    }

    // ✅ LOGIN STATUS (FOR NAVBAR)
    @GetMapping("/status")
    public Map<String, Object> loginStatus(
            @AuthenticationPrincipal OAuth2User user) {

        Map<String, Object> res = new HashMap<>();

        if (user != null) {
            res.put("loggedIn", true);
            res.put("name", user.getAttribute("name"));
        } else {
            res.put("loggedIn", false);
        }

        return res;
    }
}