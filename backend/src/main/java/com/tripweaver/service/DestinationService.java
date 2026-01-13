package com.tripweaver.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.tripweaver.model.Destination;

@Service
public class DestinationService {

    @Value("${google.places.api.key:}")
    private String googleApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<Destination> searchDestinationsGoogle(String query, String category) {
        try {
            if (googleApiKey == null || googleApiKey.isEmpty()) return new ArrayList<>();

            String type = null;
            if ("accommodation".equalsIgnoreCase(category)) type = "lodging";
            else if ("tourist_attraction".equalsIgnoreCase(category)) type = "tourist_attraction";
            else if ("restaurant".equalsIgnoreCase(category)) type = "restaurant";

            String q = query;
            if ("accommodation".equalsIgnoreCase(category)) q += " hotels";
            if ("tourist_attraction".equalsIgnoreCase(category)) q += " attractions";
            if ("restaurant".equalsIgnoreCase(category)) q += " restaurants";

            String url = "https://maps.googleapis.com/maps/api/place/textsearch/json?"
                    + "query=" + URLEncoder.encode(q, StandardCharsets.UTF_8)
                    + "&key=" + googleApiKey;
            if (type != null) url += "&type=" + type;

            org.springframework.http.ResponseEntity<String> entity = restTemplate.getForEntity(url, String.class);
            if (!entity.getStatusCode().is2xxSuccessful() || entity.getBody() == null) return new ArrayList<>();

            JSONObject json = new JSONObject(entity.getBody());
            JSONArray results = json.optJSONArray("results");
            if (results == null) return new ArrayList<>();

            List<Destination> out = new ArrayList<>();
            for (int i = 0; i < results.length(); i++) {
                JSONObject r = results.getJSONObject(i);
                String name = r.optString("name", "Unknown");
                String address = r.optString("formatted_address", "");
                JSONObject location = r.optJSONObject("geometry") != null ? r.optJSONObject("geometry").optJSONObject("location") : null;
                double lat = location != null ? location.optDouble("lat", 0.0) : 0.0;
                double lon = location != null ? location.optDouble("lng", 0.0) : 0.0;
                String placeId = r.optString("place_id", "");

                String photoUrl = null;
                List<String> photoUrls = new ArrayList<>();
                JSONArray photos = r.optJSONArray("photos");
                if (photos != null && photos.length() > 0) {
                    // Get up to 5 photos
                    for (int k = 0; k < Math.min(photos.length(), 5); k++) {
                        JSONObject ph = photos.optJSONObject(k);
                        String photoRef = ph != null ? ph.optString("photo_reference", null) : null;
                        if (photoRef != null) {
                            String pUrl = "https://maps.googleapis.com/maps/api/place/photo?"
                                    + "maxwidth=800&photoreference=" + URLEncoder.encode(photoRef, StandardCharsets.UTF_8)
                                    + "&key=" + googleApiKey;
                            photoUrls.add(pUrl);
                            if (k == 0) photoUrl = pUrl;
                        }
                    }
                }

                if (photoUrl == null) {
                    photoUrl = "https://source.unsplash.com/800x400/?"
                            + URLEncoder.encode(name + "," + category, StandardCharsets.UTF_8);
                    photoUrls.add(photoUrl);
                }

                Destination d = new Destination(name, address, lat, lon, category != null ? category : "", placeId);
                d.setPhotoUrl(photoUrl);
                d.setPhotoUrls(photoUrls);

                if (r.has("rating")) d.setRating(r.optDouble("rating"));
                if (r.has("user_ratings_total")) d.setUserRatingCount(r.optInt("user_ratings_total"));

                out.add(d);
            }

            return out;

        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    public List<Destination> searchAllGoogle(String query) {
        List<Destination> out = new ArrayList<>();
        out.addAll(searchDestinationsGoogle(query, "accommodation"));
        out.addAll(searchDestinationsGoogle(query, "restaurant"));
        out.addAll(searchDestinationsGoogle(query, "tourist_attraction"));
        return out;
    }

    public List<String> getPlacePhotosLegacy(String placeId) {
        try {
            if (googleApiKey == null || googleApiKey.isEmpty()) return new ArrayList<>();

            String url = "https://maps.googleapis.com/maps/api/place/details/json?place_id="
                    + URLEncoder.encode(placeId, StandardCharsets.UTF_8)
                    + "&key=" + googleApiKey;

            org.springframework.http.ResponseEntity<String> entity = restTemplate.getForEntity(url, String.class);
            if (!entity.getStatusCode().is2xxSuccessful() || entity.getBody() == null) return new ArrayList<>();

            JSONObject json = new JSONObject(entity.getBody());
            JSONObject result = json.optJSONObject("result");
            JSONArray photos = result != null ? result.optJSONArray("photos") : null;

            List<String> out = new ArrayList<>();
            if (photos != null) {
                for (int i = 0; i < photos.length(); i++) {
                    JSONObject ph = photos.getJSONObject(i);
                    String ref = ph.optString("photo_reference", null);
                    if (ref != null) {
                        String photoUrl = "https://maps.googleapis.com/maps/api/place/photo?"
                                + "maxwidth=800&photoreference=" + URLEncoder.encode(ref, StandardCharsets.UTF_8)
                                + "&key=" + googleApiKey;
                        out.add(photoUrl);
                    }
                }
            }
            return out;

        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}
