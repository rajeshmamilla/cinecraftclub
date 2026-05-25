package com.c3.backend.controller;

import com.c3.backend.model.User;
import com.c3.backend.repository.UserRepository;
import com.c3.backend.security.CustomUserDetails;
import com.c3.backend.security.JwtService;
import com.c3.backend.service.OtpService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .provider("local")
                .build();
        
        userRepository.save(user);

        String jwtToken = jwtService.generateToken(new CustomUserDetails(user));
        return ResponseEntity.ok(new AuthResponse(jwtToken));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String jwtToken = jwtService.generateToken(userDetails);
        
        return ResponseEntity.ok(new AuthResponse(jwtToken));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String username = authentication.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("User not found");
        }
        User user = userOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("emailVerified", user.getEmailVerified() != null ? user.getEmailVerified() : false);
        response.put("fullName", user.getFullName());
        response.put("profilePicUrl", user.getProfilePicUrl());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-verification-otp")
    public ResponseEntity<?> sendVerificationOtp(Authentication authentication, @RequestBody EmailRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = request.getEmail();
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent() && !existingUser.get().getUsername().equals(authentication.getName())) {
            return ResponseEntity.badRequest().body("Email is already registered by another account");
        }

        otpService.generateAndSendOtp(email, "EMAIL_VERIFICATION");
        return ResponseEntity.ok("Verification OTP sent to " + email);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(Authentication authentication, @RequestBody VerifyOtpRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = request.getEmail();
        String code = request.getCode();
        
        boolean verified = otpService.verifyOtp(email, code, "EMAIL_VERIFICATION");
        if (!verified) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }
        
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setEmail(email);
        user.setEmailVerified(true);
        userRepository.save(user);
        
        return ResponseEntity.ok("Email verified successfully");
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<?> forgotPasswordRequest(@RequestBody EmailRequest request) {
        String email = request.getEmail();
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("No account found with this email");
        }
        
        otpService.generateAndSendOtp(email, "PASSWORD_RESET");
        return ResponseEntity.ok("Password recovery OTP sent to " + email);
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> forgotPasswordReset(@RequestBody ResetPasswordRequest request) {
        String email = request.getEmail();
        String code = request.getCode();
        String newPassword = request.getNewPassword();
        
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Password must be at least 6 characters long");
        }
        
        boolean verified = otpService.verifyOtp(email, code, "PASSWORD_RESET");
        if (!verified) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        return ResponseEntity.ok("Password reset successfully");
    }

    @PostMapping("/change-username/request")
    public ResponseEntity<?> changeUsernameRequest(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getEmail() == null || !Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.badRequest().body("Verify your email address before changing your username");
        }
        
        otpService.generateAndSendOtp(user.getEmail(), "CHANGE_USERNAME");
        return ResponseEntity.ok("Security authorization OTP sent to your verified email");
    }

    @PostMapping("/change-username/confirm")
    public ResponseEntity<?> changeUsernameConfirm(Authentication authentication, @RequestBody ChangeUsernameRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getEmail() == null || !Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.badRequest().body("Verify your email address before changing your username");
        }
        
        String code = request.getCode();
        String newUsername = request.getNewUsername();
        
        if (newUsername == null || newUsername.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("New username is required");
        }
        
        if (userRepository.findByUsername(newUsername).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken");
        }
        
        boolean verified = otpService.verifyOtp(user.getEmail(), code, "CHANGE_USERNAME");
        if (!verified) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }
        
        user.setUsername(newUsername);
        userRepository.save(user);
        
        // Generate a new token since the username changed
        String newToken = jwtService.generateToken(new CustomUserDetails(user));
        return ResponseEntity.ok(new AuthResponse(newToken));
    }
}

@Data
class RegisterRequest {
    private String username;
    private String password;
}

@Data
class LoginRequest {
    private String username;
    private String password;
}

@Data
@RequiredArgsConstructor
class AuthResponse {
    private final String token;
}

@Data
class EmailRequest {
    private String email;
}

@Data
class VerifyOtpRequest {
    private String email;
    private String code;
}

@Data
class ResetPasswordRequest {
    private String email;
    private String code;
    private String newPassword;
}

@Data
class ChangeUsernameRequest {
    private String code;
    private String newUsername;
}
