package com.tripweaver.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import com.tripweaver.model.CollaborationTrip;
import com.tripweaver.model.SavedTrip;
import com.tripweaver.repository.CollaborationTripRepository;
import com.tripweaver.repository.SavedTripRepository;

@Service
public class CollaborationTripService {

    @Autowired
    private CollaborationTripRepository repository;

    @Autowired
    private SavedTripRepository savedTripRepository;

    public CollaborationTrip saveTrip(CollaborationTrip trip) {
        return repository.save(trip);
    }

    public List<CollaborationTrip> getAllTrips() {
        List<CollaborationTrip> trips = repository.findAll();
        for (CollaborationTrip trip : trips) {
            boolean missingDetails =
                    isBlank(trip.getFlightDetails()) &&
                    isBlank(trip.getReturnFlightDetails()) &&
                    isBlank(trip.getHotelDetails());
            if (!missingDetails) continue;
            if (isBlank(trip.getHostEmail()) || isBlank(trip.getDestination()) || isBlank(trip.getStartDate()) || isBlank(trip.getEndDate())) {
                continue;
            }

            SavedTrip saved = savedTripRepository
                    .findFirstByEmailIgnoreCaseAndDestinationIgnoreCaseAndStartDateAndEndDateAndOpenTripTrueOrderByCreatedAtDesc(
                            trip.getHostEmail(), trip.getDestination(), trip.getStartDate(), trip.getEndDate()
                    )
                    .orElse(null);

            if (saved == null) continue;

            boolean changed = false;
            if (isBlank(trip.getFlightDetails()) && !isBlank(saved.getFlightDetails())) {
                trip.setFlightDetails(saved.getFlightDetails());
                changed = true;
            }
            if (isBlank(trip.getReturnFlightDetails()) && !isBlank(saved.getReturnFlightDetails())) {
                trip.setReturnFlightDetails(saved.getReturnFlightDetails());
                changed = true;
            }
            if (isBlank(trip.getHotelDetails()) && !isBlank(saved.getHotelDetails())) {
                trip.setHotelDetails(saved.getHotelDetails());
                changed = true;
            }

            if (changed) {
                repository.save(trip);
            }
        }
        return trips;
    }

    public Map<String, Object> acceptSeat(Long tripId) {
        CollaborationTrip trip = repository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        int seats = Math.max(0, trip.getSeatsAvailable() == null ? 0 : trip.getSeatsAvailable());
        Map<String, Object> result = new HashMap<>();

        if (seats <= 1) {
            repository.delete(trip);
            result.put("removed", true);
            result.put("seatsRemaining", 0);
            result.put("tripId", tripId);
            return result;
        }

        trip.setSeatsAvailable(seats - 1);
        CollaborationTrip saved = repository.save(trip);
        result.put("removed", false);
        result.put("seatsRemaining", saved.getSeatsAvailable());
        result.put("tripId", saved.getId());
        return result;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
