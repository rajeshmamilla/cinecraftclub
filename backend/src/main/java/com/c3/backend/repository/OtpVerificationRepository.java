package com.c3.backend.repository;

import com.c3.backend.model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Integer> {
    Optional<OtpVerification> findFirstByEmailAndOtpCodeAndPurposeOrderByCreatedAtDesc(String email, String otpCode, String purpose);
    void deleteByEmailAndPurpose(String email, String purpose);
}
