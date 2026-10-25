package com.healthpassport.dto;

import jakarta.validation.constraints.Size;

public record EmergencyHealthCardRequest(
    @Size(max = 10, message = "Blood group must not exceed 10 characters")
    String bloodGroup,

    @Size(max = 1000, message = "Allergies must not exceed 1000 characters")
    String allergies,

    @Size(max = 1000, message = "Current medications must not exceed 1000 characters")
    String currentMedications,

    @Size(max = 1000, message = "Medical conditions must not exceed 1000 characters")
    String medicalConditions,

    @Size(max = 100, message = "Emergency contact name must not exceed 100 characters")
    String emergencyContactName,

    @Size(max = 60, message = "Emergency contact relationship must not exceed 60 characters")
    String emergencyContactRelationship,

    @Size(max = 40, message = "Emergency contact phone must not exceed 40 characters")
    String emergencyContactPhone,

    @Size(max = 2000, message = "Additional notes must not exceed 2000 characters")
    String additionalNotes
) {}
