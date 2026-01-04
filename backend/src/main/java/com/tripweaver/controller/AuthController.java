package com.tripweaver.controller;

import com.tripweaver.model.User;
import com.tripweaver.service.UserService;

import java.util.HashMap;
import java.util.Map; // <-- ADDED

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @GetMapping("/test")
    public String testEndpoint() {
        return "Backend is running fine!";
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(@RequestBody User user) {
        String result = userService.registerUser(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", result);

        if (result.toLowerCase().contains("success")) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

   @PostMapping("/signin")
    public ResponseEntity<Map<String, Object>> signin(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String email = payload.get("email");
        String password = payload.get("password");

        if ((username == null || username.isBlank()) && (email == null || email.isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Provide username or email"));
        }

        User user = null;

        if ((username == null || username.isBlank()) && email != null) {
            user = userService.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid username or password!"));
            }
            username = user.getUsername();
        } else {
             // Find by username if provided
             user = userService.findByUsername(username).orElse(null);
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );
            
            // Refetch user if null (though if authentication passed, it should exist, but good to be safe)
            if (user == null) {
                 user = userService.findByUsername(username).orElse(null);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            if (user != null) {
                response.put("username", user.getUsername());
                response.put("email", user.getEmail());
                response.put("role", user.getRole());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid username or password!"));
        }
    }
}