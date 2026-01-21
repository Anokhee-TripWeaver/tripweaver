package com.tripweaver.service;

import com.tripweaver.model.SearchHistory;
import com.tripweaver.repository.SearchHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchHistoryService {

    private final SearchHistoryRepository repo;

    public SearchHistoryService(SearchHistoryRepository repo) {
        this.repo = repo;
    }

    public void save(String email, String query, String category, String type) {
        SearchHistory h = new SearchHistory();
        h.setEmail(email);
        h.setQuery(query);
        h.setCategory(category);
        h.setType(type);
        repo.save(h);
    }

    public List<SearchHistory> getUserHistory(String email) {
        return repo.findByEmailOrderBySearchedAtDesc(email);
    }
}
