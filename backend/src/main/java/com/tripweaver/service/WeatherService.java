package com.tripweaver.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Random;

@Service
public class WeatherService {

    public String getWeather(String city) {
        // In a real app, you'd call OpenWeatherMap or similar API
        // For now, let's provide a realistic mock response for common cities
        String cityLower = city.toLowerCase().trim();
        
        if (cityLower.contains("hyderabad")) {
            return "🌡️ **Current Weather in Hyderabad**\n" +
                   "• Temperature: 32°C (Feels like 34°C)\n" +
                   "• Condition: Mostly Sunny ☀️\n" +
                   "• Humidity: 45%\n" +
                   "• Wind: 12 km/h NW\n\n" +
                   "It's a great day to visit Charminar or enjoy some Biryani! 🍛";
        } else if (cityLower.contains("bangalore") || cityLower.contains("bengaluru")) {
            return "🌡️ **Current Weather in Bangalore**\n" +
                   "• Temperature: 24°C\n" +
                   "• Condition: Pleasant/Cloudy ☁️\n" +
                   "• Humidity: 60%\n" +
                   "• Wind: 15 km/h E\n\n" +
                   "Perfect weather for a walk in Cubbon Park! 🌳";
        } else if (cityLower.contains("goa")) {
            return "🌡️ **Current Weather in Goa**\n" +
                   "• Temperature: 30°C\n" +
                   "• Condition: Tropical/Sunny 🏖️\n" +
                   "• Humidity: 75%\n" +
                   "• Wind: 10 km/h SW\n\n" +
                   "Ideal for the beach! Don't forget your sunscreen. 🧴";
        }
        
        // Random generator for other cities
        String[] conditions = {"Sunny ☀️", "Partly Cloudy ⛅", "Cloudy ☁️", "Light Rain 🌦️"};
        int temp = 20 + new Random().nextInt(15);
        String cond = conditions[new Random().nextInt(conditions.length)];
        
        return "🌡️ **Current Weather in " + city + "**\n" +
               "• Temperature: " + temp + "°C\n" +
               "• Condition: " + cond + "\n" +
               "• Humidity: " + (40 + new Random().nextInt(40)) + "%\n\n" +
               "Hope you have a wonderful trip! ✈️";
    }
}
