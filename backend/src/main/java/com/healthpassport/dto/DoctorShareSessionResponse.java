package com.healthpassport.dto;

import java.time.Instant;
import java.util.List;

public record DoctorShareSessionResponse(
    Long id,
    String sharingCode, // Non-null when newly created or generated, null in audit/history listings
    Instant expiresAt,
    boolean active,
    boolean expired,
    Instant createdAt,
    int recordCount,
    List<MedicalRecordResponse> authorizedRecords
) {}
