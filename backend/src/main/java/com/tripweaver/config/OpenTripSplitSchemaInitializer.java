package com.tripweaver.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures the open_trip_split table exists so split persistence doesn't 500.
 * Runs on startup; safe to re-run (uses CREATE TABLE IF NOT EXISTS).
 */
@Component
public class OpenTripSplitSchemaInitializer {
    private static final Logger log = LoggerFactory.getLogger(OpenTripSplitSchemaInitializer.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS open_trip_split (
                  id BIGINT AUTO_INCREMENT PRIMARY KEY,
                  owner_id VARCHAR(255) NOT NULL,
                  post_key VARCHAR(255) NOT NULL,
                  data_json LONGTEXT,
                  form_json LONGTEXT,
                  member_form_json LONGTEXT,
                  updated_at DATETIME,
                  UNIQUE KEY uk_owner_post (owner_id, post_key)
                )
            """);
            log.info("open_trip_split table ensured");
        } catch (Exception ex) {
            log.error("Failed to ensure open_trip_split table", ex);
        }
    }
}
