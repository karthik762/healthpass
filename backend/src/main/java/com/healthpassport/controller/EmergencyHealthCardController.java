package com.healthpassport.controller;

import com.healthpassport.dto.ApiResponse;
import com.healthpassport.dto.EmergencyHealthCardRequest;
import com.healthpassport.dto.EmergencyHealthCardResponse;
import com.healthpassport.service.EmergencyHealthCardService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/emergency-card")
public class EmergencyHealthCardController {
    private final EmergencyHealthCardService emergencyCardService;

    public EmergencyHealthCardController(EmergencyHealthCardService emergencyCardService) {
        this.emergencyCardService = emergencyCardService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<EmergencyHealthCardResponse>> get(Authentication authentication) {
        return emergencyCardService.getForOwner(authentication.getName())
            .map(card -> ResponseEntity.ok(ApiResponse.success("Emergency health card retrieved", card)))
            .orElseGet(() -> ResponseEntity.ok(ApiResponse.success("No emergency health card created yet", null)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<EmergencyHealthCardResponse>> createOrUpdate(
        Authentication authentication,
        @Valid @RequestBody EmergencyHealthCardRequest request
    ) {
        EmergencyHealthCardResponse response = emergencyCardService.createOrUpdate(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Emergency health card saved successfully", response));
    }
}
