package com.healthpassport.service;

import com.healthpassport.dto.*;
import com.healthpassport.entity.DoctorProfile;
import com.healthpassport.entity.DoctorVerificationStatus;
import com.healthpassport.entity.User;
import com.healthpassport.entity.UserRole;
import com.healthpassport.exception.ConflictException;
import com.healthpassport.exception.ResourceNotFoundException;
import com.healthpassport.exception.SecurityAccessDeniedException;
import com.healthpassport.repository.DoctorProfileRepository;
import com.healthpassport.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DoctorService {
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public DoctorService(
        UserRepository userRepository,
        DoctorProfileRepository doctorProfileRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public DoctorProfileResponse registerDoctor(DoctorRegistrationRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new ConflictException("Passwords do not match");
        }

        if (!request.termsAccepted()) {
            throw new ConflictException("You must accept the terms of use and privacy policy");
        }

        String email = normalize(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with that email address already exists");
        }

        String regNo = request.medicalRegistrationNumber().trim().toUpperCase();
        if (doctorProfileRepository.existsByMedicalRegistrationNumber(regNo)) {
            throw new ConflictException("A doctor is already registered with medical registration number " + regNo);
        }

        // Server-assigned role: ROLE_DOCTOR. Never trust client-supplied roles.
        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.ROLE_DOCTOR);
        User savedUser = userRepository.save(user);

        // Initial status: PENDING_VERIFICATION. Never automatic approval.
        DoctorProfile profile = new DoctorProfile();
        profile.setUser(savedUser);
        profile.setMedicalRegistrationNumber(regNo);
        profile.setLicensingAuthority(request.licensingAuthority().trim());
        profile.setProfessionalQualification(request.professionalQualification().trim());
        profile.setSpecialization(request.specialization().trim());
        profile.setClinicOrHospitalName(request.clinicOrHospitalName() != null ? request.clinicOrHospitalName().trim() : null);
        profile.setContactNumber(request.contactNumber() != null ? request.contactNumber().trim() : null);
        profile.setVerificationStatus(DoctorVerificationStatus.PENDING_VERIFICATION);

        DoctorProfile savedProfile = doctorProfileRepository.save(profile);
        return toProfileResponse(savedProfile);
    }

    @Transactional(readOnly = true)
    public DoctorProfileResponse getDoctorProfile(String doctorEmail) {
        DoctorProfile profile = doctorProfileRepository.findByUserEmail(normalize(doctorEmail))
            .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        return toProfileResponse(profile);
    }

    @Transactional(readOnly = true)
    public DoctorProfile requireApprovedDoctor(String doctorEmail) {
        DoctorProfile profile = doctorProfileRepository.findByUserEmail(normalize(doctorEmail))
            .orElseThrow(() -> new SecurityAccessDeniedException("No doctor account registered for this email"));

        if (profile.getVerificationStatus() != DoctorVerificationStatus.APPROVED) {
            throw new SecurityAccessDeniedException(
                "Access to clinical doctor dashboard features requires an approved medical license verification. Current status: " + profile.getVerificationStatus()
            );
        }
        return profile;
    }

    // --- Administrative Review Workflow ---

    @Transactional(readOnly = true)
    public List<DoctorProfileResponse> listDoctorsForReview() {
        return doctorProfileRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(this::toProfileResponse)
            .toList();
    }

    @Transactional
    public DoctorProfileResponse reviewDoctorApplication(String reviewerEmail, Long doctorProfileId, ReviewDoctorRequest request) {
        DoctorProfile profile = doctorProfileRepository.findById(doctorProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor application not found"));

        profile.setVerificationStatus(request.status());
        profile.setVerificationNotes(request.notes());
        profile.setVerifiedAt(Instant.now());
        profile.setVerifiedBy(reviewerEmail);

        DoctorProfile saved = doctorProfileRepository.save(profile);
        return toProfileResponse(saved);
    }

    public DoctorProfileResponse toProfileResponse(DoctorProfile p) {
        return new DoctorProfileResponse(
            p.getId(),
            p.getUser().getId(),
            p.getUser().getFullName(),
            p.getUser().getEmail(),
            p.getMedicalRegistrationNumber(),
            p.getLicensingAuthority(),
            p.getProfessionalQualification(),
            p.getSpecialization(),
            p.getClinicOrHospitalName(),
            p.getContactNumber(),
            p.getVerificationStatus(),
            p.getVerificationNotes(),
            p.getVerifiedAt(),
            p.getVerifiedBy(),
            p.getCreatedAt()
        );
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }
}
