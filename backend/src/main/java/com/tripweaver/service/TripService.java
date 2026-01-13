package com.tripweaver.service;

import com.tripweaver.model.SavedTrip;
import com.tripweaver.repository.SavedTripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tripweaver.model.TripResponse;
import com.tripweaver.model.Hotel;
import com.tripweaver.model.Destination;
import java.util.List;

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

    public List<SavedTrip> getAllSavedTrips() {
        return savedTripRepository.findAll();
    }

    public TripResponse getTripData(String origin, String destination, String date, Double budget) {
        TripResponse response = new TripResponse();
        response.setFlights(flightService.searchFlights(origin, destination, date));
        
        List<Hotel> hotels = hotelService.searchHotels(destination, budget);
        
        // Enrich hotels with images from Google Places API
        int limit = 10;
        int count = 0;
        for (Hotel h : hotels) {
            if (count >= limit) break;
            
            // Fetch if no photos or limited photos (to get "View Rooms" gallery)
            if (h.getPhotoUrls() == null || h.getPhotoUrls().isEmpty() || h.getPhotoUrls().size() < 3) {
                try {
                    String query = h.getName() + " " + destination;
                    List<Destination> results = destinationService.searchDestinationsGoogle(query, "accommodation");
                    
                    if (!results.isEmpty()) {
                        Destination d = results.get(0);
                        
                        // Set main photo if missing
                        if (h.getPhotoUrl() == null || h.getPhotoUrl().isEmpty()) {
                            h.setPhotoUrl(d.getPhotoUrl());
                        }
                        
                        // Merge photos
                        if (d.getPhotoUrls() != null && !d.getPhotoUrls().isEmpty()) {
                            List<String> currentPhotos = h.getPhotoUrls();
                            if (currentPhotos == null) currentPhotos = new java.util.ArrayList<>();
                            
                            for (String p : d.getPhotoUrls()) {
                                if (!currentPhotos.contains(p)) {
                                    currentPhotos.add(p);
                                }
                            }
                            h.setPhotoUrls(currentPhotos);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error fetching image for " + h.getName() + ": " + e.getMessage());
                }
            }
            count++;
        }
        
        response.setHotels(hotels);
        return response;
    }
}
