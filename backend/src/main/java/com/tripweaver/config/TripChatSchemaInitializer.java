package com.tripweaver.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class TripChatSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(TripChatSchemaInitializer.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS trip_chat_message (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    trip_id BIGINT NOT NULL,
                    sender_name VARCHAR(255),
                    sender_email VARCHAR(255),
                    message_text LONGTEXT,
                    created_at DATETIME,
                    INDEX idx_trip_chat_trip_created (trip_id, created_at)
                )
                """);
            log.info("trip_chat_message table ensured");
        } catch (Exception ex) {
            log.error("Failed to ensure trip_chat_message table", ex);
        }
    }
}
