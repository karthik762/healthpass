package com.healthpassport.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record MedicalRecordRequest(
    @NotBlank(message = "Record title is required") @Size(max = 160) String title,
    @NotBlank(message = "Record type is required") @Size(max = 60) String recordType,
    @Size(max = 120) String providerName,
    @NotNull(message = "Record date is required") @PastOrPresent(message = "Record date cannot be in the future") LocalDate recordDate,
    @Size(max = 2000) String notes
) { }
