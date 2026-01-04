package com.tripweaver.repository;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    List<SearchHistory> findByUserOrderBySearchTimestampDesc(User user);
}
