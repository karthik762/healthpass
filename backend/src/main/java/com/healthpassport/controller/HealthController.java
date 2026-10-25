package com.healthpassport.controller;

import com.healthpassport.dto.ApiResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> data = Map.of("status", "UP", "service", "centralized-health-passport-api", "checkedAt", Instant.now());
        return ResponseEntity.ok(ApiResponse.success("Service is healthy", data));
    }
}
