package com.healthpassport.dto;

public record AiSummaryStatusResponse(
    boolean ollamaAvailable,
    String configuredModel,
    String baseUrl,
    String message
) {}
