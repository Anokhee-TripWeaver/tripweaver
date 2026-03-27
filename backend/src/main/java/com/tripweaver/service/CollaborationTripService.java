package com.tripweaver.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import com.tripweaver.model.CollaborationTrip;
import com.tripweaver.model.JoinRequest;
import com.tripweaver.model.SavedTrip;
import com.tripweaver.repository.CollaborationTripRepository;
import com.tripweaver.repository.JoinRequestRepository;
import com.tripweaver.repository.SavedTripRepository;

@Service
public class CollaborationTripService {

    @Autowired
    private CollaborationTripRepository repository;

    @Autowired
    private SavedTripRepository savedTripRepository;

    @Autowired
    private JoinRequestRepository joinRequestRepository;

    public CollaborationTrip saveTrip(CollaborationTrip trip) {
        // Always calculate pricePerPerson before saving
        if ((trip.getPricePerPerson() == null || trip.getPricePerPerson() <= 0)
                && trip.getTotalCost() != null && trip.getTotalCost() > 0
                && trip.getSeatsAvailable() != null && trip.getSeatsAvailable() >= 0) {
            trip.setPricePerPerson(trip.getTotalCost() / (trip.getSeatsAvailable() + 1));
        }
        return repository.save(trip);
    }

    public CollaborationTrip getTripById(Long tripId) {
        CollaborationTrip trip = repository.findById(tripId).orElse(null);
        if (trip == null) return null;
        // If pricePerPerson is missing, calculate it from totalCost and seatsAvailable
        if ((trip.getPricePerPerson() == null || trip.getPricePerPerson() <= 0)
                && trip.getTotalCost() != null && trip.getTotalCost() > 0
                && trip.getSeatsAvailable() != null) {
            double ppp = trip.getTotalCost() / (trip.getSeatsAvailable() + 1);
            trip.setPricePerPerson(ppp);
            repository.save(trip); // persist so it's correct next time
        }
        // If still missing, try to recover from SavedTrip
        if ((trip.getPricePerPerson() == null || trip.getPricePerPerson() <= 0)
                && trip.getHostEmail() != null && trip.getDestination() != null) {
            savedTripRepository.findFirstByEmailIgnoreCaseAndDestinationIgnoreCaseAndStartDateAndEndDateAndOpenTripTrueOrderByCreatedAtDesc(
                    trip.getHostEmail(), trip.getDestination(), trip.getStartDate(), trip.getEndDate()
            ).ifPresent(saved -> {
                if (saved.getTotalCost() != null && saved.getSeatsAvailable() != null) {
                    trip.setPricePerPerson(saved.getTotalCost() / (saved.getSeatsAvailable() + 1));
                    repository.save(trip);
                }
            });
        }
        return trip;
    }

    private CollaborationTrip findByIdOrRepair(Long tripId) {
        return repository.findById(tripId).orElseGet(() -> {
            // AUTO-REPAIR: If trip is missing but referenced by a join request, create a placeholder
            List<JoinRequest> related = joinRequestRepository.findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(tripId, "ACCEPTED");
            if (related.isEmpty()) {
                related = joinRequestRepository.findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(tripId, "PENDING");
            }
            
            if (!related.isEmpty()) {
                JoinRequest ref = related.get(0);
                CollaborationTrip placeholder = new CollaborationTrip();
                placeholder.setId(tripId);
                placeholder.setDestination(ref.getDestination());
                placeholder.setStartDate(ref.getStartDate());
                placeholder.setEndDate(ref.getEndDate());
                placeholder.setHostEmail(ref.getHostEmail());
                placeholder.setHostName(ref.getHostName());
                
                // Try to recover cost and seats from SavedTrip
                savedTripRepository.findFirstByEmailIgnoreCaseAndDestinationIgnoreCaseAndStartDateAndEndDateAndOpenTripTrueOrderByCreatedAtDesc(
                    ref.getHostEmail(), ref.getDestination(), ref.getStartDate(), ref.getEndDate()
                ).ifPresent(saved -> {
                    placeholder.setTotalCost(saved.getTotalCost());
                    placeholder.setSeatsAvailable(saved.getSeatsAvailable());
                    placeholder.setPricePerPerson(saved.getTotalCost() / (saved.getSeatsAvailable() + 1));
                    placeholder.setFlightDetails(saved.getFlightDetails());
                    placeholder.setReturnFlightDetails(saved.getReturnFlightDetails());
                    placeholder.setHotelDetails(saved.getHotelDetails());
                });

                if (placeholder.getTotalCost() == null) placeholder.setTotalCost(0.0);
                if (placeholder.getSeatsAvailable() == null) placeholder.setSeatsAvailable(0);
                
                return repository.save(placeholder);
            }
            throw new RuntimeException("Trip not found and cannot be recovered");
        });
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
        CollaborationTrip trip = findByIdOrRepair(tripId);

        int seats = Math.max(0, trip.getSeatsAvailable() == null ? 0 : trip.getSeatsAvailable());
        Map<String, Object> result = new HashMap<>();

        if (seats <= 1) {
            trip.setSeatsAvailable(0);
            repository.save(trip);
            result.put("removed", false);
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
