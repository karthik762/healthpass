package com.healthpassport.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFamilyGroupRequest(
    @NotBlank(message = "Family group name is required")
    @Size(min = 2, max = 100, message = "Family group name must be between 2 and 100 characters")
    String name
) {}
