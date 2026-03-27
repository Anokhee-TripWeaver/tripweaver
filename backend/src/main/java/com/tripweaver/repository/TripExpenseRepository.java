package com.tripweaver.repository;

import com.tripweaver.model.TripExpense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripExpenseRepository extends JpaRepository<TripExpense, Long> {
    List<TripExpense> findByTripIdOrderByCreatedAtDesc(Long tripId);
}
