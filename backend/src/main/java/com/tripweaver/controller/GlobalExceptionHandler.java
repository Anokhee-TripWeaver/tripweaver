package com.tripweaver.controller;

import com.tripweaver.model.TripResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<?> handleAnyThrowable(Throwable ex, HttpServletRequest request) {
        String path = request != null ? request.getRequestURI() : "";

        if ("/api/trips/search".equals(path)) {
            TripResponse fallback = new TripResponse();
            fallback.setFlights(new ArrayList<>());
            fallback.setHotels(new ArrayList<>());
            return ResponseEntity.ok(fallback);
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Internal server error"));
    }
}

