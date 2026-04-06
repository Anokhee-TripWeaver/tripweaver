package com.tripweaver.controller;

import com.tripweaver.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", allowCredentials = "false")
public class AdminController {

    @Autowired
    private AdminService adminService;

    // Simple hardcoded admin auth - no Spring Security changes needed
    @PostMapping("/login")
    public ResponseEntity<?> adminLogin(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if ("admin".equals(username) && "admin".equals(password)) {
            return ResponseEntity.ok(Map.of("success", true, "role", "ROLE_ADMIN"));
        }
        return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid credentials"));
    }

    @GetMapping("/stats")
    public Map<String, Long> getStats() {
        return Map.of("users", adminService.getUserCount(), "bookings", adminService.getBookingCount());
    }

    @GetMapping("/users")
    public List<?> getAllUsers() { return adminService.getAllUsers(); }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @GetMapping("/bookings")
    public List<?> getBookings() { return adminService.getAllBookings(); }
}
