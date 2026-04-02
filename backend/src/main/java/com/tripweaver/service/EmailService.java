package com.tripweaver.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripweaver.model.Booking;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private boolean hasValidSenderCredentials() {
        return fromEmail != null
                && !fromEmail.isBlank()
                && !"your-email@gmail.com".equalsIgnoreCase(fromEmail.trim());
    }

    public void sendBookingConfirmation(String toEmail, Booking booking) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("TripWeaver - Booking Confirmation #" + booking.getId());

            String content = buildEmailContent(booking);
            helper.setText(content, true); // true = html

            // Check if credentials are valid (simple check)
            if (!hasValidSenderCredentials()) {
                return;
            }

            mailSender.send(message);

        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }

    private String buildEmailContent(Booking booking) {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><body style='font-family: Arial, sans-serif; color: #333;'>");
        
        // Header
        sb.append("<div style='background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #007bff;'>");
        sb.append("<h2 style='color: #007bff; margin: 0;'>TripWeaver Booking Confirmed!</h2>");
        sb.append("<p style='font-size: 16px; margin-top: 10px;'>Get ready for your adventure to <strong>").append(booking.getDestination()).append("</strong></p>");
        sb.append("</div>");

        sb.append("<div style='padding: 20px;'>");
        sb.append("<p>Dear Traveller,</p>");
        sb.append("<p>Thank you for booking with TripWeaver. Here are your complete trip details.</p>");

        // 1. Trip Overview
        sb.append("<h3 style='border-bottom: 1px solid #ddd; padding-bottom: 5px;'>🗓️ Trip Overview</h3>");
        sb.append("<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>");
        sb.append("<tr><td style='padding: 8px; border: 1px solid #ddd;'><strong>Booking ID:</strong></td><td style='padding: 8px; border: 1px solid #ddd;'>#").append(booking.getId()).append("</td></tr>");
        sb.append("<tr><td style='padding: 8px; border: 1px solid #ddd;'><strong>Destination:</strong></td><td style='padding: 8px; border: 1px solid #ddd;'>").append(booking.getDestination()).append("</td></tr>");
        sb.append("<tr><td style='padding: 8px; border: 1px solid #ddd;'><strong>Dates:</strong></td><td style='padding: 8px; border: 1px solid #ddd;'>").append(booking.getStartDate()).append(" to ").append(booking.getEndDate()).append("</td></tr>");
        sb.append("<tr><td style='padding: 8px; border: 1px solid #ddd;'><strong>Total Cost:</strong></td><td style='padding: 8px; border: 1px solid #ddd;'>₹").append(booking.getTotalCost()).append("</td></tr>");
        sb.append("</table>");

        // 2. Hotel Details
        if (booking.getHotelDetails() != null && !booking.getHotelDetails().isEmpty()) {
            sb.append("<h3 style='border-bottom: 1px solid #ddd; padding-bottom: 5px;'>🏨 Hotel Details</h3>");
            try {
                JsonNode hotelNode = objectMapper.readTree(booking.getHotelDetails());
                String hotelName = hotelNode.has("name") ? hotelNode.get("name").asText() : "N/A";
                String address = hotelNode.has("address") ? hotelNode.get("address").asText() : "Address not available";
                
                sb.append("<div style='background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;'>");
                sb.append("<p style='margin: 5px 0;'><strong>Hotel Name:</strong> ").append(hotelName).append("</p>");
                sb.append("<p style='margin: 5px 0;'><strong>Location:</strong> ").append(address).append("</p>");
                
                // Add Google Maps Link if address is available
                if (!"Address not available".equals(address)) {
                    String mapLink = "https://www.google.com/maps/search/?api=1&query=" + java.net.URLEncoder.encode(hotelName + " " + address, "UTF-8");
                    sb.append("<p><a href='").append(mapLink).append("' style='color: #007bff; text-decoration: none;'>📍 View on Google Maps</a></p>");
                }
                sb.append("</div>");
            } catch (Exception e) {
                sb.append("<p>Details available in your account.</p>");
            }
        }

        // 3. Flight Details (Outbound)
        if (booking.getFlightDetails() != null && !booking.getFlightDetails().isEmpty()) {
            sb.append("<h3 style='border-bottom: 1px solid #ddd; padding-bottom: 5px;'>✈️ Outbound Flight</h3>");
            try {
                JsonNode flightNode = objectMapper.readTree(booking.getFlightDetails());
                appendFlightInfo(sb, flightNode);
            } catch (Exception e) {
                sb.append("<p>Flight details available in your account.</p>");
            }
        }

        // 4. Return Flight Details
        if (booking.getReturnFlightDetails() != null && !booking.getReturnFlightDetails().isEmpty()) {
            sb.append("<h3 style='border-bottom: 1px solid #ddd; padding-bottom: 5px;'>✈️ Return Flight</h3>");
            try {
                JsonNode returnFlightNode = objectMapper.readTree(booking.getReturnFlightDetails());
                appendFlightInfo(sb, returnFlightNode);
            } catch (Exception e) {
                sb.append("<p>Return flight details available in your account.</p>");
            }
        }

        sb.append("<p style='margin-top: 30px;'>Safe travels!</p>");
        sb.append("<p><strong>The TripWeaver Team</strong></p>");
        sb.append("</div>");
        sb.append("</body></html>");
        return sb.toString();
    }

    private void appendFlightInfo(StringBuilder sb, JsonNode flight) {
        String airline = flight.has("airline") ? flight.get("airline").asText() : "Airline";
        String flightNum = flight.has("flight_number") ? flight.get("flight_number").asText() : (flight.has("flightNumber") ? flight.get("flightNumber").asText() : "N/A");
        String depAirport = flight.has("departure_airport") ? flight.get("departure_airport").asText() : (flight.has("departureAirport") ? flight.get("departureAirport").asText() : "N/A");
        String arrAirport = flight.has("arrival_airport") ? flight.get("arrival_airport").asText() : (flight.has("arrivalAirport") ? flight.get("arrivalAirport").asText() : "N/A");
        String depTime = flight.has("departure_time") ? flight.get("departure_time").asText() : (flight.has("departureTime") ? flight.get("departureTime").asText() : "N/A");
        String arrTime = flight.has("arrival_time") ? flight.get("arrival_time").asText() : (flight.has("arrivalTime") ? flight.get("arrivalTime").asText() : "N/A");

        sb.append("<div style='background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #007bff;'>");
        sb.append("<p style='margin: 5px 0;'><strong>Airline:</strong> ").append(airline).append(" (").append(flightNum).append(")</p>");
        sb.append("<p style='margin: 5px 0;'><strong>From:</strong> ").append(depAirport).append(" at ").append(depTime).append("</p>");
        sb.append("<p style='margin: 5px 0;'><strong>To:</strong> ").append(arrAirport).append(" at ").append(arrTime).append("</p>");
        sb.append("</div>");
    }

    public void sendJoinAcceptedEmail(String toEmail, String requesterName, String hostName, String destination, String startDate, String endDate) {
        try {
            if (!hasValidSenderCredentials()) {
                throw new IllegalStateException("Invalid mail sender credentials in configuration");
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("TripWeaver - Your Join Request Was Accepted");

            String content = "<html><body style='font-family: Arial;'>"
                    + "<h2>Great news! Your request is accepted</h2>"
                    + "<p>Hi <strong>" + requesterName + "</strong>,</p>"
                    + "<p><strong>" + hostName + "</strong> accepted your join request.</p>"
                    + "<p><b>Destination:</b> " + destination + "</p>"
                    + "<p><b>Dates:</b> " + startDate + " to " + endDate + "</p>"
                    + "<br><p>Please contact the host for further details.</p>"
                    + "<br><p>- TripWeaver Team</p>"
                    + "</body></html>";

            helper.setText(content, true);
            mailSender.send(message);

        } catch (Exception e) {
            System.err.println("Join accepted email failed: " + e.getMessage());
            throw new RuntimeException("Failed to send accepted email", e);
        }
    }

    public void sendJoinRequestEmail(String toEmail, String hostName, String requesterName, String requesterEmail, String destination, String startDate, String endDate) {
        try {
            if (!hasValidSenderCredentials()) {
                throw new IllegalStateException("Invalid mail sender credentials in configuration");
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("TripWeaver - Join Request for " + destination);

            String content = "<html><body style='font-family: Arial;'>"
                    + "<h2>New Join Request</h2>"
                    + "<p>Hi <strong>" + hostName + "</strong>,</p>"
                    + "<p><strong>" + requesterName + "</strong> wants to join your trip.</p>"
                    + "<p><b>Destination:</b> " + destination + "</p>"
                    + "<p><b>Dates:</b> " + startDate + " to " + endDate + "</p>"
                    + "<p><b>Requester Email:</b> " + requesterEmail + "</p>"
                    + "<br>"
                    + "<p>Please contact them directly if you approve.</p>"
                    + "<br><p>– TripWeaver Team</p>"
                    + "</body></html>";

            helper.setText(content, true);
            mailSender.send(message);

        } catch (Exception e) {
            System.err.println("Join request email failed: " + e.getMessage());
            throw new RuntimeException("Failed to send join request email", e);
        }
    }

    public void sendPaymentConfirmationEmail(String toEmail, String paymentId, String status, Double amount) {
        try {
            if (!hasValidSenderCredentials()) {
                return;
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("TripWeaver - Payment Confirmation");

            String content = "<html><body style='font-family: Arial;'>"
                    + "<h2>Payment Successful!</h2>"
                    + "<p>Your payment has been processed successfully.</p>"
                    + "<p><b>Payment ID:</b> " + paymentId + "</p>"
                    + "<p><b>Status:</b> " + status + "</p>"
                    + "<p><b>Amount Paid:</b> ₹" + amount + "</p>"
                    + "<br><p>Thank you for choosing TripWeaver!</p>"
                    + "</body></html>";

            helper.setText(content, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send payment confirmation email: " + e.getMessage());
        }
    }

    public void sendAgentEmail(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent != null ? htmlContent : "", true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send agent email: " + e.getMessage());
            throw new RuntimeException("Email send failed", e);
        }
    }

    public void sendBookingGroupEmail(String toEmail, String bookedByName, String destination, String startDate, String endDate, Double totalCost, Double perPersonCost, int travellersCount) {
        try {
            if (!hasValidSenderCredentials()) {
                return;
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("TripWeaver - Group Booking Confirmation for " + destination);

            String content = "<html><body style='font-family: Arial;'>"
                    + "<h2>Group Booking Confirmed!</h2>"
                    + "<p>Hi there,</p>"
                    + "<p><strong>" + bookedByName + "</strong> has successfully booked tickets for your group trip to <strong>" + destination + "</strong>!</p>"
                    + "<div style='background-color: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 20px 0;'>"
                    + "<p style='margin: 5px 0;'><b>Destination:</b> " + destination + "</p>"
                    + "<p style='margin: 5px 0;'><b>Dates:</b> " + startDate + " to " + endDate + "</p>"
                    + "<p style='margin: 5px 0;'><b>Total Cost:</b> ₹" + totalCost + "</p>"
                    + "<p style='margin: 5px 0;'><b>Your Share:</b> ₹" + perPersonCost + "</p>"
                    + "<p style='margin: 5px 0;'><b>Total Travellers:</b> " + travellersCount + "</p>"
                    + "</div>"
                    + "<p>Get ready for your journey!</p>"
                    + "<br><p>– The TripWeaver Team</p>"
                    + "</body></html>";

            helper.setText(content, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send group booking email to " + toEmail + ": " + e.getMessage());
        }
    }
}
