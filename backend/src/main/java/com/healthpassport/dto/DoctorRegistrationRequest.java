package com.healthpassport.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DoctorRegistrationRequest(
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    String fullName,

    @NotBlank(message = "Email address is required")
    @Email(message = "Please enter a valid email address")
    @Size(max = 254, message = "Email cannot exceed 254 characters")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
    String password,

    @NotBlank(message = "Confirm password is required")
    String confirmPassword,

    @NotBlank(message = "Medical registration number is required")
    @Size(min = 3, max = 100, message = "Medical registration number must be between 3 and 100 characters")
    String medicalRegistrationNumber,

    @NotBlank(message = "State medical council or licensing authority is required")
    @Size(min = 3, max = 150, message = "Licensing authority must be between 3 and 150 characters")
    String licensingAuthority,

    @NotBlank(message = "Professional qualification is required")
    @Size(min = 2, max = 100, message = "Qualification must be between 2 and 100 characters")
    String professionalQualification,

    @NotBlank(message = "Specialization is required")
    @Size(min = 2, max = 100, message = "Specialization must be between 2 and 100 characters")
    String specialization,

    String clinicOrHospitalName,

    String contactNumber,

    boolean termsAccepted
) {}
