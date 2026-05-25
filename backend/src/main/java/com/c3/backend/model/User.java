package com.c3.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    // Made nullable for OAuth users
    @Column(unique = true)
    private String email;

    // Made nullable for OAuth users
    @Column(name = "password_hash")
    private String password;

    @Column(name = "full_name")
    private String fullName;

    private String bio;

    @Column(name = "profile_pic_url")
    private String profilePicUrl;

    private String provider; // 'local' or 'google'

    @Column(name = "provider_id")
    private String providerId;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (provider == null) {
            provider = "local";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
