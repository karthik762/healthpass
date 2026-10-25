package com.healthpassport.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record CreateDoctorShareSessionRequest(
    @NotEmpty(message = "At least one medical record must be selected for sharing")
    Set<Long> recordIds,

    @NotNull(message = "Expiry duration in minutes is required")
    Integer expiryMinutes
) {}
