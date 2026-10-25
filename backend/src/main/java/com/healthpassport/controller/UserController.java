package com.healthpassport.controller;

import com.healthpassport.dto.ApiResponse;
import com.healthpassport.dto.UserRegistrationRequest;
import com.healthpassport.dto.UserResponse;
import com.healthpassport.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) { this.userService = userService; }
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody UserRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Account created successfully", userService.register(request)));
    }
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> currentUser(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Authenticated user retrieved", userService.toResponse(userService.findByEmail(authentication.getName()))));
    }
}
