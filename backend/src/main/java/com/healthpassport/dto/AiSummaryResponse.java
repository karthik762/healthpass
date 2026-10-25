package com.healthpassport.dto;

import java.time.Instant;
import java.time.LocalDate;

public record AiSummaryResponse(
    Long summaryId,
    Long recordId,
    String recordTitle,
    String recordType,
    String providerName,
    LocalDate recordDate,
    String modelName,
    String overview,
    String keyFindings,
    String measurements,
    String medications,
    String followUpInstructions,
    String questionsForDoctor,
    String missingInformation,
    String disclaimer,
    Instant generatedAt,
    boolean cached
) {}
