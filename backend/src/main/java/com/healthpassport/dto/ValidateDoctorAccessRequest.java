package com.healthpassport.dto;

import jakarta.validation.constraints.NotBlank;

public record ValidateDoctorAccessRequest(
    @NotBlank(message = "Sharing code is required")
    String code
) {}
