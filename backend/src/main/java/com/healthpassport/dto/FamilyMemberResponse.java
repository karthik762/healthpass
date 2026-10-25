package com.healthpassport.dto;

import java.time.Instant;

public record FamilyMemberResponse(
    Long membershipId,
    Long userId,
    String fullName,
    String email,
    String role,
    String status,
    boolean recordAccessGranted,
    boolean requestedRecordAccess,
    Instant joinedAt
) {}
