package com.healthpassport.dto;

import java.util.List;

public record TimeWindowTrendItem(
    String periodLabel,
    int totalEvents,
    int contributingPatientsCount,
    boolean suppressed
) {}
