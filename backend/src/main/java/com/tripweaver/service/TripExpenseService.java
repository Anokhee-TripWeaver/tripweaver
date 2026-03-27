package com.tripweaver.service;

import com.tripweaver.model.CollaborationTrip;
import com.tripweaver.model.JoinRequest;
import com.tripweaver.model.TripExpense;
import com.tripweaver.repository.CollaborationTripRepository;
import com.tripweaver.repository.JoinRequestRepository;
import com.tripweaver.repository.TripExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TripExpenseService {

    @Autowired
    private TripExpenseRepository tripExpenseRepository;

    @Autowired
    private CollaborationTripRepository collaborationTripRepository;

    @Autowired
    private JoinRequestRepository joinRequestRepository;

    public List<Map<String, String>> getTripMembers(Long tripId) {
        CollaborationTrip trip = getTripOrThrow(tripId);
        LinkedHashMap<String, String> byEmail = new LinkedHashMap<>();
        addMember(byEmail, trip.getHostEmail(), trip.getHostName());

        // Include accepted + pending joiners so split lists show everyone who expressed interest
        List<JoinRequest> acceptedOrPending = joinRequestRepository.findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(tripId, "ACCEPTED");
        acceptedOrPending.addAll(joinRequestRepository.findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(tripId, "PENDING"));
        for (JoinRequest req : acceptedOrPending) {
            addMember(byEmail, req.getRequesterEmail(), req.getRequesterName());
        }

        return byEmail.entrySet().stream()
                .map(e -> Map.of("email", e.getKey(), "name", e.getValue()))
                .collect(Collectors.toList());
    }

    public TripExpense addExpense(Long tripId, Map<String, Object> payload) {
        CollaborationTrip trip = getTripOrThrow(tripId);
        List<Map<String, String>> members = getTripMembers(tripId);
        Set<String> memberEmails = members.stream()
                .map(m -> normalize(m.get("email")))
                .filter(e -> !e.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        String description = trim((String) payload.get("description"));
        if (description.isBlank()) {
            description = "Trip expense";
        }

        BigDecimal amount = parseAmount(payload.get("amount"));
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than zero");
        }

        String paidByEmail = normalize((String) payload.get("paidByEmail"));
        if (paidByEmail.isBlank()) {
            throw new RuntimeException("paidByEmail is required");
        }
        // Auto-add payer to members if missing to avoid rejection when join list is incomplete
        memberEmails.add(paidByEmail);

        String paidByName = trim((String) payload.get("paidByName"));
        if (paidByName.isBlank()) {
            paidByName = findNameByEmail(members, paidByEmail);
        }

        String splitType = (String) payload.getOrDefault("splitType", "EQUAL");
        Map<String, BigDecimal> customAllocations = new HashMap<>();
        
        List<String> splitBetween = extractSplitBetween(payload.get("splitBetweenEmails"));
        if (splitBetween.isEmpty()) {
            splitBetween = new ArrayList<>(memberEmails);
        }
        
        if ("CUSTOM".equalsIgnoreCase(splitType)) {
            Map<String, Object> rawAllocations = (Map<String, Object>) payload.get("allocations");
            if (rawAllocations == null || rawAllocations.isEmpty()) {
                throw new RuntimeException("Allocations required for custom split");
            }
            for (String email : splitBetween) {
                BigDecimal val = parseAmount(rawAllocations.get(email));
                customAllocations.put(email, val);
            }
            // Ensure sum equals total
            BigDecimal sum = customAllocations.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.compareTo(amount.setScale(2, RoundingMode.HALF_UP)) != 0) {
                throw new RuntimeException("Sum of custom splits (₹" + sum + ") must equal total amount (₹" + amount + ")");
            }
        }

        TripExpense expense = new TripExpense();
        expense.setTripId(trip.getId());
        expense.setDescription(description);
        expense.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        expense.setPaidByEmail(paidByEmail);
        expense.setPaidByName(paidByName);
        expense.setSplitType(splitType.toUpperCase());
        expense.setSplitBetweenCsv(String.join(",", splitBetween));
        
        if ("CUSTOM".equalsIgnoreCase(splitType)) {
            String allocationsJson = customAllocations.entrySet().stream()
                .map(e -> "\"" + e.getKey() + "\":" + e.getValue())
                .collect(Collectors.joining(",", "{", "}"));
            expense.setSplitBetweenCsv(expense.getSplitBetweenCsv() + "|" + allocationsJson);
        }
        
        return tripExpenseRepository.save(expense);
    }

    public List<TripExpense> getExpenses(Long tripId) {
        getTripOrThrow(tripId);
        return tripExpenseRepository.findByTripIdOrderByCreatedAtDesc(tripId);
    }

    public Map<String, Object> getSettlement(Long tripId) {
        List<Map<String, String>> members = getTripMembers(tripId);
        Map<String, String> nameByEmail = new LinkedHashMap<>();
        for (Map<String, String> member : members) {
            nameByEmail.put(normalize(member.get("email")), member.get("name"));
        }

        Map<String, BigDecimal> ledger = new LinkedHashMap<>();
        for (String email : nameByEmail.keySet()) {
            ledger.put(email, BigDecimal.ZERO);
        }

        List<TripExpense> expenses = getExpenses(tripId);
        BigDecimal total = BigDecimal.ZERO;
        for (TripExpense expense : expenses) {
            BigDecimal amount = nvl(expense.getAmount());
            total = total.add(amount);

            String payer = normalize(expense.getPaidByEmail());
            if (!ledger.containsKey(payer)) {
                ledger.put(payer, BigDecimal.ZERO);
            }
            // Step 1: Add the full amount to the payer's balance (they are "up" by this amount)
            ledger.put(payer, ledger.get(payer).add(amount));

            // Step 2: Subtract each person's share (including the payer's own share)
            if ("CUSTOM".equalsIgnoreCase(expense.getSplitType())) {
                String csv = expense.getSplitBetweenCsv();
                if (csv != null && csv.contains("|")) {
                    String json = csv.substring(csv.indexOf("|") + 1);
                    Map<String, BigDecimal> allocations = parseAllocations(json);
                    for (Map.Entry<String, BigDecimal> entry : allocations.entrySet()) {
                        String member = normalize(entry.getKey());
                        if (!ledger.containsKey(member)) {
                            ledger.put(member, BigDecimal.ZERO);
                        }
                        // Subtract their specific share
                        ledger.put(member, ledger.get(member).subtract(entry.getValue()));
                    }
                    continue;
                }
            }

            // Default: Equal Split
            List<String> splitBetween = parseSplitCsv(expense.getSplitBetweenCsv());
            if (splitBetween.isEmpty()) continue;
            BigDecimal share = amount.divide(BigDecimal.valueOf(splitBetween.size()), 10, RoundingMode.HALF_UP);
            for (String member : splitBetween) {
                if (!ledger.containsKey(member)) {
                    ledger.put(member, BigDecimal.ZERO);
                }
                // Subtract their equal share
                ledger.put(member, ledger.get(member).subtract(share));
            }
        }

        Map<String, Long> creditCents = new LinkedHashMap<>();
        Map<String, Long> debtCents = new LinkedHashMap<>();
        List<Map<String, Object>> balances = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : ledger.entrySet()) {
            BigDecimal rounded = e.getValue().setScale(2, RoundingMode.HALF_UP);
            long cents = rounded.movePointRight(2).longValue();
            if (cents > 0) creditCents.put(e.getKey(), cents);
            if (cents < 0) debtCents.put(e.getKey(), -cents);
            balances.add(Map.of(
                    "email", e.getKey(),
                    "name", nameByEmail.getOrDefault(e.getKey(), e.getKey()),
                    "balance", rounded
            ));
        }

        List<Map<String, Object>> settlements = new ArrayList<>();
        List<Map.Entry<String, Long>> creditors = new ArrayList<>(creditCents.entrySet());
        List<Map.Entry<String, Long>> debtors = new ArrayList<>(debtCents.entrySet());
        int i = 0, j = 0;
        while (i < debtors.size() && j < creditors.size()) {
            Map.Entry<String, Long> debtor = debtors.get(i);
            Map.Entry<String, Long> creditor = creditors.get(j);
            long pay = Math.min(debtor.getValue(), creditor.getValue());
            if (pay > 0) {
                settlements.add(Map.of(
                        "fromEmail", debtor.getKey(),
                        "fromName", nameByEmail.getOrDefault(debtor.getKey(), debtor.getKey()),
                        "toEmail", creditor.getKey(),
                        "toName", nameByEmail.getOrDefault(creditor.getKey(), creditor.getKey()),
                        "amount", BigDecimal.valueOf(pay).movePointLeft(2).setScale(2, RoundingMode.HALF_UP)
                ));
            }
            debtor.setValue(debtor.getValue() - pay);
            creditor.setValue(creditor.getValue() - pay);
            if (debtor.getValue() == 0) i++;
            if (creditor.getValue() == 0) j++;
        }

        return Map.of(
                "tripId", tripId,
                "totalExpenses", total.setScale(2, RoundingMode.HALF_UP),
                "balances", balances,
                "settlements", settlements
        );
    }

    private CollaborationTrip getTripOrThrow(Long tripId) {
        return collaborationTripRepository.findById(tripId)
                .orElseGet(() -> {
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
                        placeholder.setSeatsAvailable(0);
                        placeholder.setTotalCost(0.0);
                        return collaborationTripRepository.save(placeholder);
                    }
                    throw new RuntimeException("Trip not found and cannot be recovered");
                });
    }

    private void addMember(LinkedHashMap<String, String> map, String email, String name) {
        String normalized = normalize(email);
        if (normalized.isBlank()) return;
        map.putIfAbsent(normalized, trim(name).isBlank() ? "Trip Member" : trim(name));
    }

    private String findNameByEmail(List<Map<String, String>> members, String email) {
        String normalized = normalize(email);
        return members.stream()
                .filter(m -> normalize(m.get("email")).equals(normalized))
                .map(m -> m.getOrDefault("name", "Trip Member"))
                .findFirst()
                .orElse("Trip Member");
    }

    private List<String> parseSplitCsv(String csv) {
        if (csv == null || csv.isBlank()) return new ArrayList<>();
        return Arrays.stream(csv.split(","))
                .map(this::normalize)
                .filter(s -> !s.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private List<String> extractSplitBetween(Object raw) {
        if (!(raw instanceof List<?> list)) return new ArrayList<>();
        List<String> emails = new ArrayList<>();
        for (Object item : list) {
            if (item == null) continue;
            emails.add(item.toString());
        }
        return emails;
    }

    private BigDecimal parseAmount(Object raw) {
        if (raw == null) return BigDecimal.ZERO;
        if (raw instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        String text = raw.toString().trim();
        if (text.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(text);
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private Map<String, BigDecimal> parseAllocations(String json) {
        Map<String, BigDecimal> result = new HashMap<>();
        if (json == null || !json.startsWith("{") || !json.endsWith("}")) return result;
        String content = json.substring(1, json.length() - 1);
        if (content.isBlank()) return result;
        String[] pairs = content.split(",");
        for (String pair : pairs) {
            String[] parts = pair.split(":");
            if (parts.length != 2) continue;
            String key = parts[0].replace("\"", "").trim();
            BigDecimal val = parseAmount(parts[1].trim());
            result.put(key, val);
        }
        return result;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
