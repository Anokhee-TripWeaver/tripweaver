package com.tripweaver.controller;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.model.User;
import com.tripweaver.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/{username}")
    public ResponseEntity<?> getUserProfile(@PathVariable String username) {
        Optional<User> userOpt = userService.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Don't return password
            Map<String, Object> response = Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "id", user.getId()
            );
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> updateUserProfile(@PathVariable String username, @RequestBody Map<String, String> updates) {
        Optional<User> userOpt = userService.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Allow updating email
            if (updates.containsKey("email")) {
                user.setEmail(updates.get("email"));
            }
            // Allow updating username (careful with PK/Unique constraints, but let's allow it if logic permits)
            // Ideally, changing username requires token re-issuance or logout. 
            // For now, let's assume username is the ID and immutable or handle carefully.
            // If we allow username change, we must ensure it doesn't conflict.
            
            // Let's stick to email update for now as username is the key in the path.
            // If they want to update username, it's more complex.
            // But user asked "edit my user name".
            
            if (updates.containsKey("username") && !updates.get("username").equals(username)) {
                String newUsername = updates.get("username");
                if (userService.findByUsername(newUsername).isPresent()) {
                    return ResponseEntity.badRequest().body("Username already taken");
                }
                user.setUsername(newUsername);
            }

            userService.updateUser(user);
            return ResponseEntity.ok(Map.of("message", "Profile updated successfully", "username", user.getUsername()));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{username}/history")
    public ResponseEntity<List<SearchHistory>> getSearchHistory(@PathVariable String username) {
        return ResponseEntity.ok(userService.getSearchHistory(username));
    }

    @PostMapping("/{username}/history")
    public ResponseEntity<?> addSearchHistory(@PathVariable String username, @RequestBody Map<String, String> searchData) {
        String origin = searchData.get("origin");
        String destination = searchData.get("destination");
        String date = searchData.get("date");
        
        userService.saveSearchHistory(username, origin, destination, date);
        return ResponseEntity.ok("Search history saved");
    }
}
