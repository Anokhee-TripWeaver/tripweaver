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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthenticationManager authenticationManager;

    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

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
    public ResponseEntity<Map<String, Object>> signin(
            @RequestBody Map<String, String> payload,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
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
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );
            
            // ✅ CRITICAL: Set the security context so the session is established
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
            
            // Refetch user if null (though if authentication passed, it should exist, but good to be safe)
            if (user == null) {
                 user = userService.findByUsername(username).orElse(null);
            }
            
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Login successful");
            if (user != null) {
                responseBody.put("username", user.getUsername());
                responseBody.put("email", user.getEmail());
                responseBody.put("role", user.getRole());
            }
            
            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid username or password!"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        try {
            // Clear security context
            SecurityContextHolder.clearContext();
            
            // Invalidate session
            if (request.getSession(false) != null) {
                request.getSession().invalidate();
            }
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Logout successful");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Logout failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}