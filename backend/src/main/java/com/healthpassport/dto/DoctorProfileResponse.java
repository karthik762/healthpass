package com.healthpassport.dto;

import com.healthpassport.entity.DoctorVerificationStatus;
import java.time.Instant;

public record DoctorProfileResponse(
    Long id,
    Long userId,
    String fullName,
    String email,
    String medicalRegistrationNumber,
    String licensingAuthority,
    String professionalQualification,
    String specialization,
    String clinicOrHospitalName,
    String contactNumber,
    DoctorVerificationStatus verificationStatus,
    String verificationNotes,
    Instant verifiedAt,
    String verifiedBy,
    Instant createdAt
) {}
