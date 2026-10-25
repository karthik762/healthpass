package com.healthpassport.controller;

import com.healthpassport.dto.AiSummaryResponse;
import com.healthpassport.dto.AiSummaryStatusResponse;
import com.healthpassport.dto.ApiResponse;
import com.healthpassport.service.AiHealthSummaryService;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiHealthSummaryController {

    private final AiHealthSummaryService aiHealthSummaryService;

    public AiHealthSummaryController(AiHealthSummaryService aiHealthSummaryService) {
        this.aiHealthSummaryService = aiHealthSummaryService;
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<AiSummaryStatusResponse>> getStatus() {
        return ResponseEntity.ok(ApiResponse.success("AI service status retrieved", aiHealthSummaryService.getStatus()));
    }

    @GetMapping("/records/{recordId}/summary")
    public ResponseEntity<ApiResponse<AiSummaryResponse>> getSummary(
        @PathVariable Long recordId,
        Principal principal
    ) {
        return aiHealthSummaryService.getExistingSummary(principal.getName(), recordId)
            .map(s -> ResponseEntity.ok(ApiResponse.success("AI summary retrieved", s)))
            .orElseGet(() -> ResponseEntity.ok(ApiResponse.success("No summary has been generated for this record yet", null)));
    }

    @PostMapping("/records/{recordId}/summary")
    public ResponseEntity<ApiResponse<AiSummaryResponse>> generateSummary(
        @PathVariable Long recordId,
        @RequestParam(defaultValue = "false") boolean refresh,
        Principal principal
    ) {
        AiSummaryResponse response = aiHealthSummaryService.generateOrRefreshSummary(principal.getName(), recordId, refresh);
        return ResponseEntity.ok(ApiResponse.success("AI summary successfully generated", response));
    }
}
