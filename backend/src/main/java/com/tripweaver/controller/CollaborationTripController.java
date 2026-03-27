package com.tripweaver.controller;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;
import java.util.Collections;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tripweaver.model.CollaborationTrip;
import com.tripweaver.model.JoinRequest;
import com.tripweaver.model.TripExpense;
import com.tripweaver.model.TripBooking;
import com.tripweaver.service.CollaborationTripService;
import com.tripweaver.service.EmailService;
import com.tripweaver.service.JoinRequestService;
import com.tripweaver.service.TripExpenseService;
import com.tripweaver.repository.TripBookingRepository;
import com.tripweaver.repository.CollaborationTripRepository;

@RestController
@RequestMapping("/api/collaboration-trips")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        },
        allowCredentials = "true"
)
public class CollaborationTripController {

    @Autowired
    private CollaborationTripService service;

    @Autowired
    private CollaborationTripRepository repository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JoinRequestService joinRequestService;

    @Autowired
    private TripExpenseService tripExpenseService;

    @Autowired
    private TripBookingRepository tripBookingRepository;

    @GetMapping
    public List<CollaborationTrip> getAllTrips() {
        return service.getAllTrips();
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<CollaborationTrip> getTripById(@PathVariable Long tripId) {
        CollaborationTrip trip = service.getTripById(tripId);
        if (trip == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(trip);
    }

    // Lookup trip by destination+dates+host when postId is stale/missing
    @GetMapping("/lookup")
    public ResponseEntity<CollaborationTrip> lookupTrip(
            @RequestParam String hostEmail,
            @RequestParam String destination,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        CollaborationTrip trip = repository.findFirstByHostEmailIgnoreCaseAndDestinationIgnoreCaseAndStartDateAndEndDate(
                hostEmail, destination, startDate, endDate
        ).orElse(null);
        if (trip == null) return ResponseEntity.notFound().build();
        // Ensure pricePerPerson is calculated if missing
        if ((trip.getPricePerPerson() == null || trip.getPricePerPerson() <= 0)
                && trip.getTotalCost() != null && trip.getSeatsAvailable() != null) {
            trip.setPricePerPerson(trip.getTotalCost() / (trip.getSeatsAvailable() + 1));
            repository.save(trip);
        }
        return ResponseEntity.ok(trip);
    }

    @PostMapping("/{tripId}/bookings")
    public TripBooking createBooking(@PathVariable Long tripId, @RequestBody TripBooking booking) {
        booking.setTripId(tripId);
        if (booking.getBookingReference() == null || booking.getBookingReference().isEmpty()) {
            booking.setBookingReference("REF-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        TripBooking saved = tripBookingRepository.save(booking);

        // Send emails to all travellers
        try {
            CollaborationTrip trip = service.getTripById(tripId);
            if (trip != null) {
                Double perPerson = saved.getTotalCost() / Math.max(1, saved.getTotalTravellers());
                for (String email : saved.getTravellerEmails()) {
                    emailService.sendBookingGroupEmail(
                            email,
                            saved.getBookedByName(),
                            trip.getDestination(),
                            trip.getStartDate(),
                            trip.getEndDate(),
                            saved.getTotalCost(),
                            perPerson,
                            saved.getTotalTravellers()
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to send group booking emails: " + e.getMessage());
        }

        return saved;
    }

    @GetMapping("/{tripId}/bookings")
    public List<TripBooking> getBookings(@PathVariable Long tripId) {
        return tripBookingRepository.findByTripId(tripId);
    }

    @PostMapping
    public CollaborationTrip createTrip(@RequestBody CollaborationTrip trip) {
        return service.saveTrip(trip);
    }

    @PostMapping("/{tripId}/accept-seat")
    public ResponseEntity<Map<String, Object>> acceptSeat(@PathVariable Long tripId) {
        try {
            return ResponseEntity.ok(service.acceptSeat(tripId));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to update seat availability"));
        }
    }

    private boolean isValidEmail(String value) {
        return value != null && value.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }
    private boolean isNonBlank(String value) {
        return value != null && !value.isBlank();
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        Map<String, String> body = new HashMap<>();
        body.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // requester clicks "I am interested"
    @PostMapping("/join-requests")
    public ResponseEntity<?> createJoinRequest(@RequestBody JoinRequest request) {
        if (!isNonBlank(request.getHostEmail())) return badRequest("Host identity is required");
        if (!isNonBlank(request.getRequesterEmail())) return badRequest("Requester identity is required");
        if (request.getDestination() == null || request.getDestination().isBlank()) return badRequest("Destination is required");
        if (request.getStartDate() == null || request.getStartDate().isBlank() || request.getEndDate() == null || request.getEndDate().isBlank()) {
            return badRequest("Start and end dates are required");
        }
        JoinRequest saved = joinRequestService.create(request);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/join-requests/host")
    public List<JoinRequest> getHostJoinRequests(@RequestParam String email) {
        return joinRequestService.getForHost(email);
    }

    @GetMapping("/join-requests/requester")
    public List<JoinRequest> getRequesterJoinRequests(@RequestParam String email) {
        return joinRequestService.getForRequester(email);
    }

    @PatchMapping("/join-requests/{id}/status")
    public ResponseEntity<?> updateJoinRequestStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            return ResponseEntity.ok(joinRequestService.updateStatus(id, status));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{tripId}/members")
    public ResponseEntity<?> getTripMembers(@PathVariable Long tripId) {
        try {
            return ResponseEntity.ok(tripExpenseService.getTripMembers(tripId));
        } catch (Throwable ex) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/{tripId}/expenses")
    public ResponseEntity<?> getTripExpenses(@PathVariable Long tripId) {
        try {
            List<TripExpense> list = tripExpenseService.getExpenses(tripId);
            List<Map<String, Object>> response = list.stream().map(exp -> {
                List<String> splitBetween = exp.getSplitBetweenCsv() == null || exp.getSplitBetweenCsv().isBlank()
                        ? Collections.emptyList()
                        : Arrays.stream(exp.getSplitBetweenCsv().split(","))
                                .map(String::trim)
                                .filter(s -> !s.isBlank())
                                .collect(Collectors.toList());
                Map<String, Object> item = new HashMap<>();
                item.put("id", exp.getId());
                item.put("tripId", exp.getTripId());
                item.put("description", exp.getDescription());
                item.put("amount", exp.getAmount());
                item.put("paidByEmail", exp.getPaidByEmail());
                item.put("paidByName", exp.getPaidByName());
                item.put("splitType", exp.getSplitType());
                item.put("splitBetweenEmails", splitBetween);
                item.put("createdAt", exp.getCreatedAt());
                return item;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Throwable ex) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PostMapping("/{tripId}/expenses")
    public ResponseEntity<?> addTripExpense(@PathVariable Long tripId, @RequestBody Map<String, Object> payload) {
        try {
            TripExpense created = tripExpenseService.addExpense(tripId, payload);
            return ResponseEntity.ok(created);
        } catch (Throwable ex) {
            String message = ex.getMessage() == null || ex.getMessage().isBlank()
                    ? "Failed to add expense"
                    : ex.getMessage();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", message));
        }
    }

    @GetMapping("/{tripId}/settlements")
    public ResponseEntity<?> getTripSettlements(@PathVariable Long tripId) {
        try {
            return ResponseEntity.ok(tripExpenseService.getSettlement(tripId));
        } catch (Throwable ex) {
            return ResponseEntity.ok(Map.of(
                    "tripId", tripId,
                    "totalExpenses", 0,
                    "balances", Collections.emptyList(),
                    "settlements", Collections.emptyList()
            ));
        }
    }

    // requester clicks "I am interested"
    @PostMapping("/send-join-request-email")
    public ResponseEntity<Map<String, String>> sendJoinRequestEmail(@RequestBody Map<String, String> body) {
        String toEmail = body.get("toEmail");
        String hostName = body.get("hostName");
        String requesterName = body.get("requesterName");
        String requesterEmail = body.get("requesterEmail");
        String destination = body.get("destination");
        String startDate = body.get("startDate");
        String endDate = body.get("endDate");

        if (!isValidEmail(toEmail)) return badRequest("Host email is invalid");
        if (!isValidEmail(requesterEmail)) return badRequest("Requester email is invalid");
        if (hostName == null || hostName.isBlank()) return badRequest("Host name is required");
        if (requesterName == null || requesterName.isBlank()) return badRequest("Requester name is required");
        if (destination == null || destination.isBlank()) return badRequest("Destination is required");
        if (startDate == null || startDate.isBlank() || endDate == null || endDate.isBlank()) {
            return badRequest("Start and end dates are required");
        }

        try {
            emailService.sendJoinRequestEmail(
                    toEmail, hostName, requesterName, requesterEmail, destination, startDate, endDate
            );
            return ResponseEntity.ok(Map.of("message", "Join request email sent"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send join request email"));
        }
    }

    // host clicks "Yes"
    @PostMapping("/send-join-accepted-email")
    public ResponseEntity<Map<String, String>> sendJoinAcceptedEmail(@RequestBody Map<String, String> body) {
        String toEmail = body.get("toEmail");
        String requesterName = body.get("requesterName");
        String hostName = body.get("hostName");
        String destination = body.get("destination");
        String startDate = body.get("startDate");
        String endDate = body.get("endDate");

        if (!isValidEmail(toEmail)) return badRequest("Requester email is invalid");
        if (requesterName == null || requesterName.isBlank()) return badRequest("Requester name is required");
        if (hostName == null || hostName.isBlank()) return badRequest("Host name is required");
        if (destination == null || destination.isBlank()) return badRequest("Destination is required");
        if (startDate == null || startDate.isBlank() || endDate == null || endDate.isBlank()) {
            return badRequest("Start and end dates are required");
        }

        try {
            emailService.sendJoinAcceptedEmail(
                    toEmail, requesterName, hostName, destination, startDate, endDate
            );
            return ResponseEntity.ok(Map.of("message", "Join accepted email sent"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send acceptance email"));
        }
    }
}
