package com.healthpassport.dto;
import java.time.Instant;
import java.time.LocalDate;
public record MedicalRecordResponse(Long id, String title, String recordType, String providerName, LocalDate recordDate, String notes, Instant createdAt, Instant updatedAt) { }
