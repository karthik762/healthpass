package com.healthpassport.dto;

import java.time.Instant;

public record EmergencyHealthCardResponse(
    Long id,
    String patientName,
    String bloodGroup,
    String allergies,
    String currentMedications,
    String medicalConditions,
    String emergencyContactName,
    String emergencyContactRelationship,
    String emergencyContactPhone,
    String additionalNotes,
    Instant createdAt,
    Instant updatedAt
) {}
