package com.healthpassport.controller;

import com.healthpassport.dto.*;
import com.healthpassport.entity.DoctorProfile;
import com.healthpassport.service.DoctorService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctor")
public class DoctorPortalController {
    private final DoctorService doctorService;

    public DoctorPortalController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    // Public doctor registration
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<DoctorProfileResponse>> registerDoctor(
        @Valid @RequestBody DoctorRegistrationRequest request
    ) {
        DoctorProfileResponse response = doctorService.registerDoctor(request);
        return ResponseEntity.created(URI.create("/api/doctor/profile"))
            .body(ApiResponse.success("Doctor application submitted successfully. Your registration is pending medical council review.", response));
    }

    // Authenticated doctor profile (both PENDING and APPROVED can view their own profile)
    @GetMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorProfileResponse>> getProfile(Authentication authentication) {
        DoctorProfileResponse profile = doctorService.getDoctorProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor profile retrieved", profile));
    }

    // Protected clinical doctor dashboard endpoint - STRICTLY requires APPROVED status
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorProfileResponse>> getDoctorDashboard(Authentication authentication) {
        // Enforces APPROVED status: throws SecurityAccessDeniedException if PENDING or REJECTED
        DoctorProfile profile = doctorService.requireApprovedDoctor(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor dashboard access authorized", doctorService.toProfileResponse(profile)));
    }

    // Administrative review workflow: list pending and reviewed doctor applications
    @GetMapping("/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<DoctorProfileResponse>>> listDoctorsForReview() {
        List<DoctorProfileResponse> list = doctorService.listDoctorsForReview();
        return ResponseEntity.ok(ApiResponse.success("Doctor applications retrieved for review", list));
    }

    // Administrative review workflow: approve or reject an application
    @PutMapping("/admin/reviews/{doctorProfileId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorProfileResponse>> reviewApplication(
        Authentication authentication,
        @PathVariable Long doctorProfileId,
        @Valid @RequestBody ReviewDoctorRequest request
    ) {
        DoctorProfileResponse response = doctorService.reviewDoctorApplication(
            authentication.getName(),
            doctorProfileId,
            request
        );
        return ResponseEntity.ok(ApiResponse.success("Doctor application reviewed successfully", response));
    }
}
