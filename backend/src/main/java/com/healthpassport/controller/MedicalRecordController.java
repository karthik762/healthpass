package com.healthpassport.controller;

import com.healthpassport.dto.ApiResponse;
import com.healthpassport.dto.MedicalRecordRequest;
import com.healthpassport.dto.MedicalRecordResponse;
import com.healthpassport.service.MedicalRecordService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/records")
public class MedicalRecordController {
    private final MedicalRecordService recordService;
    public MedicalRecordController(MedicalRecordService recordService) { this.recordService = recordService; }
    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> list(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Medical records retrieved", recordService.listForOwner(authentication.getName())));
    }
    @GetMapping("/{recordId}")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> findOne(Authentication authentication, @PathVariable Long recordId) {
        return ResponseEntity.ok(ApiResponse.success("Medical record retrieved", recordService.findOne(authentication.getName(), recordId)));
    }
    @PostMapping
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> create(Authentication authentication, @Valid @RequestBody MedicalRecordRequest request) {
        MedicalRecordResponse response = recordService.create(authentication.getName(), request);
        return ResponseEntity.created(URI.create("/api/records/" + response.id())).body(ApiResponse.success("Medical record created", response));
    }
    @PutMapping("/{recordId}")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> update(Authentication authentication, @PathVariable Long recordId, @Valid @RequestBody MedicalRecordRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Medical record updated", recordService.update(authentication.getName(), recordId, request)));
    }
    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long recordId) {
        recordService.delete(authentication.getName(), recordId);
        return ResponseEntity.noContent().build();
    }
}
