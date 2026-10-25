package com.healthpassport.dto;

import java.time.Instant;

public record ApiResponse<T>(boolean success, String message, T data, Instant timestamp) {
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, Instant.now());
    }
    public static ApiResponse<Void> success(String message) {
        return success(message, null);
    }
    public static <T> ApiResponse<T> failure(String message, T data) {
        return new ApiResponse<>(false, message, data, Instant.now());
    }
    public static ApiResponse<Void> failure(String message) {
        return failure(message, null);
    }

}
