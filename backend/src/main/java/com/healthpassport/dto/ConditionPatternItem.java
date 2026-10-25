package com.healthpassport.dto;

import java.util.List;

public record ConditionPatternItem(
    String condition,
    int affectedMembersCount,
    List<String> recordCategories,
    String observationSummary
) {}
