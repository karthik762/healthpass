package com.healthpassport.dto;

import java.util.List;

public record FamilyHealthInsightsResponse(
    Long groupId,
    String groupName,
    int totalActiveMembers,
    int consentingMembersCount,
    boolean callerIncluded,
    List<ConditionPatternItem> observedPatterns,
    String dataSufficiencyNotice,
    String clinicalDisclaimer
) {}
