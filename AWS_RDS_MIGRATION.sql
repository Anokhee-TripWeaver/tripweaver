-- ============================================================
-- TripWeaver AWS RDS Migration Script
-- Run this in MySQL Workbench connected to your AWS RDS
-- ============================================================

USE tripweaverdb;

-- ============================================================
-- 1. Add missing columns to saved_trips
-- ============================================================
ALTER TABLE saved_trips 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS open_trip TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seats_available INT,
  ADD COLUMN IF NOT EXISTS note VARCHAR(255);

-- ============================================================
-- 2. Add missing columns to bookings
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(255);

-- ============================================================
-- 3. Create collaboration_trip table
-- ============================================================
CREATE TABLE IF NOT EXISTS collaboration_trip (
  id BIGINT NOT NULL AUTO_INCREMENT,
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
  hotel_details TEXT,
  PRIMARY KEY (id)
);

-- ============================================================
-- 4. Create join_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS join_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT,
  destination VARCHAR(255),
  start_date VARCHAR(255),
  end_date VARCHAR(255),
  host_name VARCHAR(255),
  host_email VARCHAR(255),
  requester_name VARCHAR(255),
  requester_email VARCHAR(255),
  origin VARCHAR(255),
  price_per_person DOUBLE,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at DATETIME(6),
  updated_at DATETIME(6),
  PRIMARY KEY (id)
);

-- ============================================================
-- 5. Create trip_bookings table
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_bookings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  trip_id BIGINT,
  booked_by_email VARCHAR(255),
  booked_by_name VARCHAR(255),
  traveller_emails TEXT,
  traveller_names TEXT,
  total_travellers INT,
  total_cost DOUBLE,
  booking_reference VARCHAR(255),
  created_at DATETIME(6),
  PRIMARY KEY (id)
);

-- ============================================================
-- 6. Create trip_expenses table
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_expenses (
  id BIGINT NOT NULL AUTO_INCREMENT,
  trip_id BIGINT,
  description VARCHAR(255),
  amount DOUBLE,
  paid_by_email VARCHAR(255),
  paid_by_name VARCHAR(255),
  split_type VARCHAR(50) DEFAULT 'EQUAL',
  split_between_csv TEXT,
  allocations_json TEXT,
  created_at DATETIME(6),
  PRIMARY KEY (id)
);

-- ============================================================
-- Done! Verify with:
-- SHOW TABLES;
-- DESCRIBE saved_trips;
-- DESCRIBE bookings;
-- ============================================================
