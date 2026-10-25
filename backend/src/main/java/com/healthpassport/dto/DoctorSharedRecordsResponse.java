package com.healthpassport.dto;

import java.time.Instant;
import java.util.List;

public record DoctorSharedRecordsResponse(
    String patientName,
    Instant expiresAt,
    boolean readOnly,
    List<MedicalRecordResponse> records,
    String disclaimer
) {}
