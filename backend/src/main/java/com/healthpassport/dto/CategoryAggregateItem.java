package com.healthpassport.dto;

import java.util.List;

public record CategoryAggregateItem(
    String categoryOrCondition,
    int totalEvents,
    int uniqueContributingPatients,
    boolean suppressed,
    String suppressionNotice
) {}
