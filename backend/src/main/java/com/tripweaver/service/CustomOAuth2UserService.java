package com.tripweaver.service;

import com.tripweaver.model.User;
import com.tripweaver.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauthUser = super.loadUser(userRequest);
        return processOAuth2User(oauthUser);
    }

    private OAuth2User processOAuth2User(OAuth2User oauthUser) {
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");

        if (email != null) {
            Optional<User> userOptional = userRepository.findByEmail(email);
            if (userOptional.isEmpty()) {
                // Register new user
                User newUser = new User();
                newUser.setEmail(email);
                
                // Generate a base username from name or email
                String baseUsername = (name != null && !name.isBlank()) 
                        ? name.replaceAll("\\s+", "") 
                        : email.split("@")[0];
                
                // Ensure username is unique
                String finalUsername = baseUsername;
                int suffix = 1;
                while (userRepository.findByUsername(finalUsername).isPresent()) {
                    finalUsername = baseUsername + suffix;
                    suffix++;
                }
                
                newUser.setUsername(finalUsername);
                newUser.setPassword("GOOGLE_OAUTH_" + UUID.randomUUID().toString()); // Dummy password
                newUser.setRole("USER");
                userRepository.save(newUser);
            } else {
                // existing user, no action needed
            }
        }
        return oauthUser;
    }
}
