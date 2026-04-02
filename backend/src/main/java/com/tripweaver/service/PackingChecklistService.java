package com.tripweaver.service;

import com.tripweaver.model.PackingItem;
import com.tripweaver.model.PackingItemDTO;
import com.tripweaver.repository.PackingItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PackingChecklistService {

    @Autowired
    private PackingItemRepository packingItemRepository;

    /**
     * Generate default packing checklist based on destination
     */
    @Transactional
    public List<PackingItemDTO> generateChecklistForBooking(Long bookingId, String destination) {
        List<String> items = getDefaultItemsForDestination(destination);
        List<PackingItem> packingItems = new ArrayList<>();

        for (String itemName : items) {
            PackingItem item = new PackingItem(bookingId, itemName);
            packingItems.add(packingItemRepository.save(item));
        }

        return packingItems.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get checklist for a specific booking
     */
    public List<PackingItemDTO> getChecklistByBookingId(Long bookingId) {
        List<PackingItem> items = packingItemRepository.findByBookingId(bookingId);
        return items.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Toggle checked status of a packing item
     */
    @Transactional
    public PackingItemDTO toggleItemChecked(Long itemId) {
        PackingItem item = packingItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Packing item not found with id: " + itemId));
        
        item.setIsChecked(!item.getIsChecked());
        PackingItem updated = packingItemRepository.save(item);
        
        return convertToDTO(updated);
    }

    /**
     * Get default packing items based on destination
     */
    private List<String> getDefaultItemsForDestination(String destination) {
        if (destination == null) return getDefaultItems();
        String d = destination.toLowerCase();

        // Beach
        if (d.contains("goa") || d.contains("bali") || d.contains("maldives") ||
            d.contains("phuket") || d.contains("miami") || d.contains("hawaii") ||
            d.contains("beach") || d.contains("island") || d.contains("coast")) {
            return Arrays.asList(
                "Passport / ID", "Sunscreen SPF 50+", "Beachwear", "Sunglasses",
                "Flip-flops", "Beach towel", "Hat / Cap", "Waterproof phone case",
                "Light breathable clothing", "Charger & power bank", "Camera",
                "Reusable water bottle", "Insect repellent", "Travel insurance docs"
            );
        }

        // Cold / Snow
        if (d.contains("switzerland") || d.contains("iceland") || d.contains("norway") ||
            d.contains("canada") || d.contains("alaska") || d.contains("finland") ||
            d.contains("sweden") || d.contains("manali") || d.contains("shimla") ||
            d.contains("kashmir") || d.contains("leh") || d.contains("snow")) {
            return Arrays.asList(
                "Passport / ID", "Heavy winter jacket", "Thermal inner wear",
                "Gloves & mittens", "Woollen scarf", "Snow boots", "Wool socks",
                "Lip balm & moisturiser", "Sunglasses (UV protection)", "Hand warmers",
                "Charger & power bank", "Camera", "Travel insurance docs", "Medications"
            );
        }

        // Adventure / Trekking
        if (d.contains("nepal") || d.contains("peru") || d.contains("new zealand") ||
            d.contains("costa rica") || d.contains("rishikesh") || d.contains("trek") ||
            d.contains("hiking") || d.contains("safari")) {
            return Arrays.asList(
                "Passport / ID", "Sturdy hiking boots", "Trekking backpack",
                "First aid kit", "Reusable water bottle", "Sunscreen", "Insect repellent",
                "Torch / headlamp", "Rain jacket / poncho", "Energy bars / snacks",
                "Charger & power bank", "Camera", "Travel insurance docs", "Medications"
            );
        }

        // Europe
        if (d.contains("paris") || d.contains("london") || d.contains("rome") ||
            d.contains("barcelona") || d.contains("amsterdam") || d.contains("berlin") ||
            d.contains("prague") || d.contains("vienna") || d.contains("europe")) {
            return Arrays.asList(
                "Passport & visa documents", "Travel adapter (Type C/G)", "Comfortable walking shoes",
                "Light jacket / trench coat", "Compact umbrella", "Day backpack",
                "Charger & power bank", "Camera", "Reusable water bottle",
                "Smart casual outfits", "Toiletries", "Travel insurance docs", "Medications"
            );
        }

        // Asia
        if (d.contains("tokyo") || d.contains("singapore") || d.contains("bangkok") ||
            d.contains("seoul") || d.contains("hong kong") || d.contains("dubai") ||
            d.contains("vietnam") || d.contains("indonesia") || d.contains("malaysia")) {
            return Arrays.asList(
                "Passport & visa documents", "Power bank", "Comfortable walking shoes",
                "Light breathable clothing", "Transport card / cash", "Charger",
                "Camera", "Hand sanitiser", "Reusable bag", "Sunscreen",
                "Toiletries", "Travel insurance docs", "Medications"
            );
        }

        // India domestic
        if (d.contains("india") || d.contains("delhi") || d.contains("mumbai") ||
            d.contains("bangalore") || d.contains("hyderabad") || d.contains("chennai") ||
            d.contains("kolkata") || d.contains("jaipur") || d.contains("agra") ||
            d.contains("kerala") || d.contains("rajasthan")) {
            return Arrays.asList(
                "Aadhaar / ID proof", "Booking confirmations", "Comfortable clothing",
                "Walking shoes & sandals", "Sunscreen", "Reusable water bottle",
                "Power bank & charger", "Camera", "Cash & UPI-enabled phone",
                "Light jacket (evenings)", "Toiletries", "Medications", "Insect repellent"
            );
        }

        return getDefaultItems();
    }

    private List<String> getDefaultItems() {
        return Arrays.asList(
            "Passport / ID", "Visa documents (if required)", "Travel insurance docs",
            "Flight & hotel confirmations", "Charger & power bank", "Camera",
            "Comfortable walking shoes", "Weather-appropriate clothing",
            "Toiletries", "Medications", "Sunglasses", "Wallet & cards",
            "Cash (local currency)", "Reusable water bottle", "Day backpack"
        );
    }

    /**
     * Convert entity to DTO
     */
    private PackingItemDTO convertToDTO(PackingItem item) {
        return new PackingItemDTO(
            item.getId(),
            item.getBookingId(),
            item.getItemName(),
            item.getIsChecked()
        );
    }
}
