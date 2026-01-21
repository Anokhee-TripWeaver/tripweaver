package com.tripweaver.util;

import java.security.Principal;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

public class SecurityUtil {

    private SecurityUtil() {}

    public static String getEmail(Principal principal) {

        if (principal == null) return null;

        Authentication auth = (Authentication) principal;
        Object principalObj = auth.getPrincipal();

        // Google OAuth
        if (principalObj instanceof OAuth2User oauthUser) {
            return oauthUser.getAttribute("email");
        }

        // Manual login (username = email)
        if (principalObj instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }

        return null;
    }
}
