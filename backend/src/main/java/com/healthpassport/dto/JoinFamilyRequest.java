package com.healthpassport.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinFamilyRequest(
    @NotBlank(message = "Invitation code is required")
    @Size(min = 6, max = 64, message = "Invitation code must be between 6 and 64 characters")
    String invitationCode
) {}
