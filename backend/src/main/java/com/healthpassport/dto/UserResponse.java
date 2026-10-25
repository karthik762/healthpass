package com.healthpassport.dto;
import com.healthpassport.entity.DoctorVerificationStatus;
import com.healthpassport.entity.UserRole;
import java.time.Instant;
public record UserResponse(
    Long id,
    String fullName,
    String email,
    UserRole role,
    DoctorVerificationStatus doctorVerificationStatus,
    Instant createdAt
) { }
