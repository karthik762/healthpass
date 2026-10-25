package com.healthpassport.dto;

import java.time.Instant;

public record FamilyInvitationResponse(
    Long id,
    String invitationCode,
    Instant expiresAt,
    String status
) {}
