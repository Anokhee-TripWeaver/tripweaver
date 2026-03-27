-- Master SQL Initialization Script

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    username VARCHAR(255) NOT NULL UNIQUE
);

-- 2. Saved Trips
CREATE TABLE IF NOT EXISTS saved_trips (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    destination VARCHAR(255),
    start_date VARCHAR(255),
    end_date VARCHAR(255),
    total_cost DOUBLE,
    budget DOUBLE,
    username VARCHAR(255),
    email VARCHAR(255),
    open_trip BOOLEAN DEFAULT FALSE,
    seats_available INT,
    note VARCHAR(255),
    flight_details TEXT,
    return_flight_details TEXT,
    hotel_details TEXT,
    created_at DATETIME(6)
);

-- 3. Collaboration Trips
CREATE TABLE IF NOT EXISTS collaboration_trip (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    origin VARCHAR(255),
    destination VARCHAR(255),
    start_date VARCHAR(255),
    end_date VARCHAR(255),
    host_name VARCHAR(255),
    host_email VARCHAR(255),
    seats_available INT,
    total_cost DOUBLE,
    price_per_person DOUBLE,
    note VARCHAR(255),
    flight_details TEXT,
    return_flight_details TEXT,
    hotel_details TEXT
);

-- 4. Join Requests (Matched to @Table(name="join_requests"))
CREATE TABLE IF NOT EXISTS join_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT,
    destination VARCHAR(255),
    start_date VARCHAR(255),
    end_date VARCHAR(255),
    host_name VARCHAR(255),
    host_email VARCHAR(255),
    requester_name VARCHAR(255),
    requester_email VARCHAR(255),
    status VARCHAR(255),
    price_per_person DOUBLE,
    origin VARCHAR(255),
    created_at DATETIME(6),
    updated_at DATETIME(6)
);

-- 5. Trip Expenses (Matched to @Table(name="trip_expenses"))
CREATE TABLE IF NOT EXISTS trip_expenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT,
    description VARCHAR(255),
    amount DECIMAL(19,2),
    paid_by_email VARCHAR(255),
    paid_by_name VARCHAR(255),
    split_type VARCHAR(255),
    split_between_csv TEXT,
    created_at DATETIME(6)
);

-- 6. Trip Bookings
CREATE TABLE IF NOT EXISTS trip_booking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT,
    booked_by_email VARCHAR(255),
    booked_by_name VARCHAR(255),
    total_travellers INT,
    total_cost DOUBLE,
    booking_reference VARCHAR(255)
);

-- 7. Booking Sub-tables
CREATE TABLE IF NOT EXISTS trip_booking_traveller_emails (
    trip_booking_id BIGINT NOT NULL,
    traveller_emails VARCHAR(255),
    FOREIGN KEY (trip_booking_id) REFERENCES trip_booking(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trip_booking_traveller_names (
    trip_booking_id BIGINT NOT NULL,
    traveller_names VARCHAR(255),
    FOREIGN KEY (trip_booking_id) REFERENCES trip_booking(id) ON DELETE CASCADE
);

-- 8. General Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    destination VARCHAR(255),
    start_date VARCHAR(255),
    end_date VARCHAR(255),
    total_cost DOUBLE,
    username VARCHAR(255),
    flight_details TEXT,
    return_flight_details TEXT,
    hotel_details TEXT,
    booking_date DATETIME(6),
    status VARCHAR(255),
    payment_id VARCHAR(255),
    payment_status VARCHAR(255)
);
