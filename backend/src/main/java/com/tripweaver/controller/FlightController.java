package com.tripweaver.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tripweaver.model.FlightPriceDTO;
import com.tripweaver.service.FlightService;

@RestController
@RequestMapping("/api/flights")
public class FlightController {

    @Autowired
    private FlightService flightService;

    @GetMapping("/offers")
    public ResponseEntity<List<FlightPriceDTO>> getOffers(
            @RequestParam String originLocationCode,
            @RequestParam String destinationLocationCode,
            @RequestParam String departureDate,
            @RequestParam(required = false) String returnDate,
            @RequestParam(defaultValue = "1") int adults
    ) {
        List<FlightPriceDTO> offers = flightService.getFlightOffers(
                originLocationCode,
                destinationLocationCode,
                departureDate,
                returnDate,
                adults
        );
        return ResponseEntity.ok(offers);
    }
}
