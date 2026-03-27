package com.tripweaver.model;

public class PopularDestinationDTO {
    private String destinationName;
    private Long bookingCount;
    private String imageUrl;

    public PopularDestinationDTO() {
    }

    public PopularDestinationDTO(String destinationName, Long bookingCount) {
        // Default to Tokyo if destination name is null or empty
        if (destinationName == null || destinationName.trim().isEmpty()) {
            this.destinationName = "Tokyo, Japan";
        } else {
            this.destinationName = destinationName;
        }
        this.bookingCount = bookingCount;
        this.imageUrl = generateImageUrl(this.destinationName);
    }

    private String generateImageUrl(String destination) {
        // Map destinations to beautiful high-quality Unsplash images
        if (destination == null || destination.trim().isEmpty()) {
            return "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=90"; // Tokyo default
        }
        
        String lowerDest = destination.toLowerCase();
        
        // Asian destinations
        if (lowerDest.contains("tokyo") || lowerDest.contains("japan")) {
            return "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=90";
        } else if (lowerDest.contains("bangkok")) {
            return "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&q=90"; // Bangkok Grand Palace
        } else if (lowerDest.contains("thailand")) {
            return "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=90"; // Thailand beaches
        } else if (lowerDest.contains("singapore")) {
            return "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=90";
        } else if (lowerDest.contains("bali")) {
            return "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=90";
        } else if (lowerDest.contains("indonesia")) {
            return "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200&q=90"; // Indonesia temples
        } else if (lowerDest.contains("seoul") || lowerDest.contains("korea")) {
            return "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1200&q=90";
        } else if (lowerDest.contains("hong kong")) {
            return "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1200&q=90";
        } else if (lowerDest.contains("goa")) {
            return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=90"; // Goa beaches
        } else if (lowerDest.contains("india")) {
            return "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=90"; // Taj Mahal
        } else if (lowerDest.contains("bangalore")) {
            return "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&q=90"; // Bangalore city
        }
        
        // European destinations
        else if (lowerDest.contains("paris") || lowerDest.contains("france")) {
            return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=90";
        } else if (lowerDest.contains("london") || lowerDest.contains("uk") || lowerDest.contains("england")) {
            return "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=90";
        } else if (lowerDest.contains("rome")) {
            return "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=90";
        } else if (lowerDest.contains("italy")) {
            return "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=90"; // Venice
        } else if (lowerDest.contains("barcelona")) {
            return "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=90";
        } else if (lowerDest.contains("spain")) {
            return "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1200&q=90"; // Madrid
        } else if (lowerDest.contains("santorini") || lowerDest.contains("greece")) {
            return "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1200&q=90";
        } else if (lowerDest.contains("amsterdam") || lowerDest.contains("netherlands")) {
            return "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=90";
        } else if (lowerDest.contains("switzerland") || lowerDest.contains("zurich")) {
            return "https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=1200&q=90";
        }
        
        // Middle East
        else if (lowerDest.contains("dubai") || lowerDest.contains("uae")) {
            return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=90";
        }
        
        // Americas
        else if (lowerDest.contains("new york") || lowerDest.contains("nyc")) {
            return "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=90";
        } else if (lowerDest.contains("los angeles") || lowerDest.contains("la")) {
            return "https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=1200&q=90";
        } else if (lowerDest.contains("miami")) {
            return "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1200&q=90";
        }
        
        // Beach/Island destinations
        else if (lowerDest.contains("maldives")) {
            return "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=90";
        } else if (lowerDest.contains("hawaii")) {
            return "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=1200&q=90";
        } else if (lowerDest.contains("phuket")) {
            return "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1200&q=90";
        }
        
        // Oceania
        else if (lowerDest.contains("sydney") || lowerDest.contains("australia")) {
            return "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=90";
        } else if (lowerDest.contains("new zealand")) {
            return "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&q=90";
        }
        
        // Default to Tokyo if no match
        else {
            return "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=90";
        }
    }

    // Getters and Setters
    public String getDestinationName() {
        return destinationName;
    }

    public void setDestinationName(String destinationName) {
        this.destinationName = destinationName;
        this.imageUrl = generateImageUrl(destinationName);
    }

    public Long getBookingCount() {
        return bookingCount;
    }

    public void setBookingCount(Long bookingCount) {
        this.bookingCount = bookingCount;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
