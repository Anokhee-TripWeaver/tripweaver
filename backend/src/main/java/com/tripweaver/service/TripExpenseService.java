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

        List<JoinRequest> accepted = joinRequestRepository.findByPostIdAndStatusIgnoreCaseOrderByCreatedAtAsc(tripId, "ACCEPTED");
        for (JoinRequest req : accepted) {
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
        if (!memberEmails.contains(paidByEmail)) {
            throw new RuntimeException("Payer must be a trip member");
        }

        String paidByName = trim((String) payload.get("paidByName"));
        if (paidByName.isBlank()) {
            paidByName = findNameByEmail(members, paidByEmail);
        }

        List<String> splitBetween = extractSplitBetween(payload.get("splitBetweenEmails"));
        if (splitBetween.isEmpty()) {
            splitBetween = new ArrayList<>(memberEmails);
        }
        splitBetween = splitBetween.stream()
                .map(this::normalize)
                .filter(memberEmails::contains)
                .distinct()
                .collect(Collectors.toList());
        if (splitBetween.isEmpty()) {
            throw new RuntimeException("splitBetweenEmails must contain at least one valid trip member");
        }

        TripExpense expense = new TripExpense();
        expense.setTripId(trip.getId());
        expense.setDescription(description);
        expense.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        expense.setPaidByEmail(paidByEmail);
        expense.setPaidByName(paidByName);
        expense.setSplitType("EQUAL");
        expense.setSplitBetweenCsv(String.join(",", splitBetween));
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
            ledger.put(payer, ledger.get(payer).add(amount));

            List<String> splitBetween = parseSplitCsv(expense.getSplitBetweenCsv());
            if (splitBetween.isEmpty()) continue;
            BigDecimal share = amount.divide(BigDecimal.valueOf(splitBetween.size()), 10, RoundingMode.HALF_UP);
            for (String member : splitBetween) {
                if (!ledger.containsKey(member)) {
                    ledger.put(member, BigDecimal.ZERO);
                }
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
                .orElseThrow(() -> new RuntimeException("Trip not found"));
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

