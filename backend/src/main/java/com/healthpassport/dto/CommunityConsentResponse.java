package com.healthpassport.dto;

import java.time.Instant;

public record CommunityConsentResponse(
    boolean optedIn,
    Instant consentedAt,
    Instant revokedAt,
    String notice
) {}
