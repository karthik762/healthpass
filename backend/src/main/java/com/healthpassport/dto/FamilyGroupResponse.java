package com.healthpassport.dto;

import java.time.Instant;
import java.util.List;

public record FamilyGroupResponse(
    Long id,
    String name,
    Long createdByUserId,
    String createdByFullName,
    Instant createdAt,
    String activeInvitationCode, // only present if caller is owner
    Instant activeInvitationExpiresAt,
    List<FamilyMemberResponse> members,
    List<FamilyMemberResponse> pendingRequests
) {}
