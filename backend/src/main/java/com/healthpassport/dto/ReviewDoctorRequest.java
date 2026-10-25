package com.healthpassport.dto;

import com.healthpassport.entity.DoctorVerificationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewDoctorRequest(
    @NotNull(message = "Status is required (APPROVED or REJECTED)")
    DoctorVerificationStatus status,

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    String notes
) {}
