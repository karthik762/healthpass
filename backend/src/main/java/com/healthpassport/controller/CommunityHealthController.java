package com.healthpassport.controller;

import com.healthpassport.dto.ApiResponse;
import com.healthpassport.dto.CommunityConsentResponse;
import com.healthpassport.dto.CommunityIntelligenceResponse;
import com.healthpassport.service.CommunityHealthService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
public class CommunityHealthController {

    private final CommunityHealthService communityService;

    public CommunityHealthController(CommunityHealthService communityService) {
        this.communityService = communityService;
    }

    @GetMapping("/insights")
    public ResponseEntity<ApiResponse<CommunityIntelligenceResponse>> getAggregatedIntelligence() {
        return ResponseEntity.ok(ApiResponse.success(
            "Community health intelligence retrieved",
            communityService.getAggregatedIntelligence()
        ));
    }

    @GetMapping("/consent")
    public ResponseEntity<ApiResponse<CommunityConsentResponse>> getConsentStatus(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
            "Community consent status retrieved",
            communityService.getConsentStatus(authentication.getName())
        ));
    }

    @PutMapping("/consent")
    public ResponseEntity<ApiResponse<CommunityConsentResponse>> updateConsent(
        Authentication authentication,
        @RequestBody Map<String, Boolean> body
    ) {
        boolean optIn = body != null && Boolean.TRUE.equals(body.get("optIn"));
        return ResponseEntity.ok(ApiResponse.success(
            optIn ? "Community health intelligence consent granted" : "Community health intelligence consent withdrawn",
            communityService.updateConsent(authentication.getName(), optIn)
        ));
    }
}
