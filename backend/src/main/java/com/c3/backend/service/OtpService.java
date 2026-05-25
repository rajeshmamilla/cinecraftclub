package com.c3.backend.service;

import com.c3.backend.model.OtpVerification;
import com.c3.backend.repository.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepository;
    private final EmailService emailService;
    private static final Random RANDOM = new Random();

    @Transactional
    public void generateAndSendOtp(String email, String purpose) {
        // 1. Generate 6 digit numeric code
        String code = String.format("%06d", RANDOM.nextInt(1000000));

        // 2. Delete any existing OTP for this email and purpose to keep table clean
        otpRepository.deleteByEmailAndPurpose(email, purpose);

        // 3. Save new OTP with 5 minute expiration
        OtpVerification verification = OtpVerification.builder()
                .email(email)
                .otpCode(code)
                .purpose(purpose)
                .expiresAt(ZonedDateTime.now().plusMinutes(5))
                .build();
        otpRepository.save(verification);

        // 4. Send email asynchronously/synchronously
        emailService.sendOtpEmail(email, code, purpose);
    }

    @Transactional
    public boolean verifyOtp(String email, String code, String purpose) {
        Optional<OtpVerification> opt = otpRepository.findFirstByEmailAndOtpCodeAndPurposeOrderByCreatedAtDesc(email, code, purpose);
        if (opt.isEmpty()) {
            return false;
        }

        OtpVerification verification = opt.get();
        if (verification.getExpiresAt().isBefore(ZonedDateTime.now())) {
            otpRepository.delete(verification);
            return false;
        }

        // Successfully verified, clean up the used OTP
        otpRepository.delete(verification);
        return true;
    }
}
