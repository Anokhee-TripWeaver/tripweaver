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
        if (destination == null) {
            return getDefaultItems();
        }

        String lowerDest = destination.toLowerCase();

        // Beach destinations
        if (lowerDest.contains("goa") || lowerDest.contains("bali") || 
            lowerDest.contains("maldives") || lowerDest.contains("phuket") ||
            lowerDest.contains("miami") || lowerDest.contains("hawaii")) {
            return Arrays.asList(
                "Passport", "Sunscreen (SPF 50+)", "Beachwear", "Sunglasses",
                "Flip-flops", "Beach towel", "Swimsuit", "Hat",
                "Waterproof phone case", "Light clothing", "Charger", "Camera"
            );
        }

        // European cities
        if (lowerDest.contains("paris") || lowerDest.contains("london") ||
            lowerDest.contains("rome") || lowerDest.contains("barcelona") ||
            lowerDest.contains("amsterdam") || lowerDest.contains("berlin")) {
            return Arrays.asList(
                "Passport", "Travel adapter (Type C/E)", "Comfortable walking shoes",
                "Light jacket", "Umbrella", "Day backpack", "Charger",
                "Camera", "Reusable water bottle", "Clothes", "Toiletries", "Medications"
            );
        }

        // Asian cities
        if (lowerDest.contains("tokyo") || lowerDest.contains("singapore") ||
            lowerDest.contains("bangkok") || lowerDest.contains("seoul") ||
            lowerDest.contains("hong kong") || lowerDest.contains("dubai")) {
            return Arrays.asList(
                "Passport", "Power bank", "Walking shoes", "Light clothing",
                "Rail pass/Transport card", "Charger", "Camera",
                "Hand sanitizer", "Face mask", "Reusable bag", "Toiletries", "Medications"
            );
        }

        // Cold destinations
        if (lowerDest.contains("switzerland") || lowerDest.contains("iceland") ||
            lowerDest.contains("norway") || lowerDest.contains("canada") ||
            lowerDest.contains("alaska")) {
            return Arrays.asList(
                "Passport", "Warm jacket", "Thermal wear", "Gloves",
                "Scarf", "Winter boots", "Wool socks", "Lip balm",
                "Moisturizer", "Charger", "Camera", "Clothes", "Toiletries"
            );
        }

        // Adventure destinations
        if (lowerDest.contains("nepal") || lowerDest.contains("peru") ||
            lowerDest.contains("new zealand") || lowerDest.contains("costa rica")) {
            return Arrays.asList(
                "Passport", "Hiking boots", "Backpack", "First aid kit",
                "Water bottle", "Sunscreen", "Insect repellent", "Flashlight",
                "Multi-tool", "Rain jacket", "Charger", "Power bank", "Clothes"
            );
        }

        // Default items for any destination
        return getDefaultItems();
    }

    /**
     * Default packing items for any trip
     */
    private List<String> getDefaultItems() {
        return Arrays.asList(
            "Passport", "Visa (if required)", "Travel insurance documents",
            "Flight tickets", "Hotel confirmations", "Charger", "Power bank",
            "Clothes", "Underwear", "Socks", "Toiletries", "Medications",
            "Sunglasses", "Wallet", "Credit cards", "Cash", "Phone"
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
