package com.tripweaver.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.model.User;
import com.tripweaver.repository.SearchHistoryRepository;
import com.tripweaver.repository.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SearchHistoryRepository searchHistoryRepository;

    @Autowired
    private BCryptPasswordEncoder encoder;

    public String registerUser(User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return "Username already exists!";
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return "Email already registered!";
        }

        // Default role
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("USER");
        }

        // Hash password
        user.setPassword(encoder.encode(user.getPassword()));

        userRepository.save(user);
        return "User registered successfully!";
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public User updateUser(User user) {
        return userRepository.save(user);
    }

    public void saveSearchHistory(String username, String origin, String destination, String date) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            SearchHistory history = new SearchHistory(origin, destination, date, userOpt.get());
            searchHistoryRepository.save(history);
        }
    }

    public List<SearchHistory> getSearchHistory(String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            return searchHistoryRepository.findByUserOrderBySearchedAtDesc(userOpt.get());
        }
        return List.of();
    }
}
