package com.c3.backend.security.oauth2;

import com.c3.backend.model.User;
import com.c3.backend.repository.UserRepository;
import com.c3.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        String providerId = oAuth2User.getAttribute("sub"); // Google's unique ID is 'sub'
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        Optional<User> userOptional = userRepository.findByProviderAndProviderId(provider, providerId);
        User user;
        
        if (userOptional.isPresent()) {
            user = userOptional.get();
            user.setFullName(name);
            user.setProfilePicUrl(picture);
            user.setEmailVerified(true);
            user = userRepository.save(user);
        } else {
            // Check if email already exists to link accounts or create a new unique username
            Optional<User> existingUserByEmail = Optional.empty();
            if (email != null && !email.trim().isEmpty()) {
                existingUserByEmail = userRepository.findByEmail(email);
            }
            
            if (existingUserByEmail.isPresent()) {
                user = existingUserByEmail.get();
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setFullName(name);
                user.setProfilePicUrl(picture);
                user.setEmailVerified(true);
                user = userRepository.save(user);
            } else {
                String username = email != null ? email.split("@")[0] + "_" + providerId.substring(0, 5) : "user_" + providerId;
                
                user = User.builder()
                        .username(username)
                        .email(email)
                        .fullName(name)
                        .profilePicUrl(picture)
                        .provider(provider)
                        .providerId(providerId)
                        .isActive(true)
                        .emailVerified(true)
                        .build();
                user = userRepository.save(user);
            }
        }

        return new CustomUserDetails(user, oAuth2User.getAttributes());
    }
}
