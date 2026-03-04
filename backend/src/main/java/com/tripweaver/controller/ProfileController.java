package com.tripweaver.controller;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.model.User;
import com.tripweaver.service.SearchHistoryService;
import com.tripweaver.service.UserService;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final SearchHistoryService historyService;
    private final UserService userService;

    public ProfileController(SearchHistoryService historyService, UserService userService) {
        this.historyService = historyService;
        this.userService = userService;
    }

    // ✅ PROFILE + HISTORY
    @GetMapping
    public Map<String, Object> getProfile(Authentication authentication) {

        Map<String, Object> res = new HashMap<>();

        // 🔐 Safety check (important)
        if (authentication == null || !authentication.isAuthenticated()) {
            res.put("loggedIn", false);
            return res;
        }

        Object principal = authentication.getPrincipal();
        String email = null;
        String name = null;
        String picture = null;

        if (principal instanceof OAuth2User) {
            OAuth2User oauthUser = (OAuth2User) principal;
            email = oauthUser.getAttribute("email");
            name = oauthUser.getAttribute("name");
            picture = oauthUser.getAttribute("picture");
        } else if (principal instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) principal;
            String username = userDetails.getUsername();
            Optional<User> userOpt = userService.findByUsername(username);
            if (userOpt.isEmpty()) {
                userOpt = userService.findByEmail(username);
            }
            if (userOpt.isPresent()) {
                User dbUser = userOpt.get();
                email = dbUser.getEmail();
                name = dbUser.getUsername(); // Or add a 'name' field to User entity if desired
                // picture = null; // Use default in frontend
            }
        }

        if (email != null) {
            res.put("loggedIn", true);
            res.put("name", name);
            res.put("email", email);
            res.put("picture", picture);

            List<SearchHistory> history = historyService.getUserHistory(email);
            res.put("history", history);
        } else {
             res.put("loggedIn", false);
        }

        return res;
    }

    // ✅ LOGIN STATUS (FOR NAVBAR)
    @GetMapping("/status")
    public Map<String, Object> loginStatus(Authentication authentication) {

        Map<String, Object> res = new HashMap<>();

        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof OAuth2User) {
                res.put("loggedIn", true);
                res.put("name", ((OAuth2User) principal).getAttribute("name"));
                res.put("email", ((OAuth2User) principal).getAttribute("email"));
            } else if (principal instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) principal;
                String username = userDetails.getUsername();
                Optional<User> userOpt = userService.findByUsername(username);
                if (userOpt.isEmpty()) {
                    userOpt = userService.findByEmail(username);
                }

                res.put("loggedIn", true);
                if (userOpt.isPresent()) {
                    User dbUser = userOpt.get();
                    res.put("name", dbUser.getUsername());
                    res.put("email", dbUser.getEmail());
                } else {
                    res.put("name", username);
                    res.put("email", "");
                }
            } else {
                 res.put("loggedIn", false);
            }
        } else {
            res.put("loggedIn", false);
        }

        return res;
    }
}
