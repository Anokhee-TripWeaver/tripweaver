package com.tripweaver.service;

import com.tripweaver.model.SavedTrip;
import com.tripweaver.repository.SavedTripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tripweaver.model.TripResponse;
import com.tripweaver.model.Hotel;
import com.tripweaver.model.Destination;
import com.tripweaver.model.Flight;
import java.util.List;
import java.util.ArrayList;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TripService {

    @Autowired
    private FlightService flightService;

    @Autowired
    private HotelService hotelService;

    @Autowired
    private DestinationService destinationService;

    @Autowired
    private SavedTripRepository savedTripRepository;

    public SavedTrip saveTrip(SavedTrip trip) {
        return savedTripRepository.save(trip);
    }

    public List<SavedTrip> getSavedTripsByUsername(String username) {
        return savedTripRepository.findByUsername(username);
    }

    @Transactional
    public void deleteSavedTrip(Long id, String username) {
        savedTripRepository.deleteByIdAndUsername(id, username);
    }

    public TripResponse getTripData(String origin, String destination, String date, Double budget) {
        TripResponse response = new TripResponse();
        try {
            List<Flight> flights = flightService.searchFlights(origin, destination, date);
            response.setFlights(flights != null ? flights : new ArrayList<>());
        } catch (Exception e) {
            System.err.println("Flight search failed, using fallback empty flights: " + e.getMessage());
            response.setFlights(new ArrayList<>());
        }

        try {
            List<Hotel> hotels = hotelService.searchHotels(destination, budget);
            int limit = Math.min(hotels.size(), 8);
            List<Hotel> topHotels = hotels.subList(0, limit);

            topHotels.parallelStream().forEach(h -> {
                try {
                    String query;
                    if (h.getAddress() != null && !h.getAddress().isBlank()) {
                        query = h.getName() + " " + h.getAddress();
                    } else {
                        query = h.getName() + " " + destination;
                    }
                    List<Destination> results = destinationService.searchDestinationsGoogle(query, "accommodation");

                    if (!results.isEmpty()) {
                        Destination d = results.get(0);

                        if (d.getPhotoUrl() != null && !d.getPhotoUrl().isEmpty()) {
                            h.setPhotoUrl(d.getPhotoUrl());
                        }

                        if (d.getPhotoUrls() != null && !d.getPhotoUrls().isEmpty()) {
                            h.setPhotoUrls(new java.util.ArrayList<>(d.getPhotoUrls()));
                        }

                        if (d.getPlaceId() != null && !d.getPlaceId().isEmpty()) {
                            h.setPlaceId(d.getPlaceId());
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error fetching image for " + h.getName() + ": " + e.getMessage());
                }
            });

            response.setHotels(topHotels);
        } catch (Exception e) {
            System.err.println("Hotel search failed, using fallback empty hotels: " + e.getMessage());
            response.setHotels(new ArrayList<>());
        }

        return response;
    }
}
