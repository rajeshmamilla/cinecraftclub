package com.c3.backend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otpCode, String purpose) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setFrom("rajeshmamilla206@gmail.com");

            String subject = "";
            String body = "";

            if ("EMAIL_VERIFICATION".equalsIgnoreCase(purpose)) {
                subject = "CineCraftClub - Verify Your Email Address";
                body = "<h2>Welcome to CineCraftClub!</h2>"
                     + "<p>Please verify your email address to protect your account.</p>"
                     + "<p>Your 6-digit OTP verification code is:</p>"
                     + "<h3 style='color: #e08e1f; font-size: 24px; letter-spacing: 2px;'>" + otpCode + "</h3>"
                     + "<p>This code is valid for 5 minutes.</p>";
            } else if ("PASSWORD_RESET".equalsIgnoreCase(purpose)) {
                subject = "CineCraftClub - Reset Your Password";
                body = "<h2>Password Reset Request</h2>"
                     + "<p>We received a request to reset your CineCraftClub password.</p>"
                     + "<p>Your 6-digit OTP password recovery code is:</p>"
                     + "<h3 style='color: #e08e1f; font-size: 24px; letter-spacing: 2px;'>" + otpCode + "</h3>"
                     + "<p>This code is valid for 5 minutes. If you did not request this, you can ignore this email.</p>";
            } else if ("CHANGE_USERNAME".equalsIgnoreCase(purpose)) {
                subject = "CineCraftClub - Authorize Username Change";
                body = "<h2>Change Username Request</h2>"
                     + "<p>Authorize changing your CineCraftClub username.</p>"
                     + "<p>Your 6-digit OTP security authorization code is:</p>"
                     + "<h3 style='color: #e08e1f; font-size: 24px; letter-spacing: 2px;'>" + otpCode + "</h3>"
                     + "<p>This code is valid for 5 minutes.</p>";
            }

            helper.setSubject(subject);
            helper.setText(body, true);

            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send OTP email via SMTP", e);
        }
    }
}
