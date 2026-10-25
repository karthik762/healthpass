package com.healthpassport.dto;

import java.time.Instant;
import java.util.List;

public record CommunityIntelligenceResponse(
    int minimumGroupSizeThreshold,
    long totalConsentingPatients,
    int eligibleRecordsAnalyzed,
    List<CategoryAggregateItem> categoryAggregates,
    List<TimeWindowTrendItem> timeWindowTrends,
    String dataSufficiencyNotice,
    String privacyNotice,
    Instant generatedAt
) {}
