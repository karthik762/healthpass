package com.healthpassport.controller;

import com.healthpassport.dto.*;
import com.healthpassport.service.DoctorShareService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/share/doctor")
public class DoctorShareController {
    private final DoctorShareService doctorShareService;

    public DoctorShareController(DoctorShareService doctorShareService) {
        this.doctorShareService = doctorShareService;
    }

    // --- Patient Endpoints (Authenticated) ---

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<DoctorShareSessionResponse>> createSession(
        Authentication authentication,
        @Valid @RequestBody CreateDoctorShareSessionRequest request
    ) {
        DoctorShareSessionResponse response = doctorShareService.createSession(authentication.getName(), request);
        return ResponseEntity.created(URI.create("/api/share/doctor/sessions/" + response.id()))
            .body(ApiResponse.success("Doctor sharing session created successfully", response));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<DoctorShareSessionResponse>>> listSessions(
        Authentication authentication
    ) {
        List<DoctorShareSessionResponse> sessions = doctorShareService.listSessionsForPatient(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Sharing sessions retrieved", sessions));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
        Authentication authentication,
        @PathVariable Long sessionId
    ) {
        doctorShareService.revokeSession(authentication.getName(), sessionId);
        return ResponseEntity.ok(ApiResponse.success("Sharing session revoked immediately"));
    }

    // --- Doctor Endpoints (Public code verification) ---

    @PostMapping("/access/validate")
    public ResponseEntity<ApiResponse<DoctorSharedRecordsResponse>> validateCode(
        @Valid @RequestBody ValidateDoctorAccessRequest request,
        HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        DoctorSharedRecordsResponse response = doctorShareService.validateAndAccessRecords(clientIp, request.code());
        return ResponseEntity.ok(ApiResponse.success("Doctor access granted", response));
    }

    @GetMapping("/access/records/{recordId}")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getSharedRecord(
        @RequestParam String code,
        @PathVariable Long recordId,
        HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        MedicalRecordResponse record = doctorShareService.getSpecificSharedRecord(clientIp, code, recordId);
        return ResponseEntity.ok(ApiResponse.success("Medical record retrieved", record));
    }

    @GetMapping("/access/records/{recordId}/summary")
    public ResponseEntity<ApiResponse<AiSummaryResponse>> getSharedRecordSummary(
        @RequestParam String code,
        @PathVariable Long recordId,
        HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        AiSummaryResponse summary = doctorShareService.getSharedRecordSummary(clientIp, code, recordId);
        return ResponseEntity.ok(ApiResponse.success("Authorized clinical summary retrieved", summary));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
