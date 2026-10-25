package com.healthpassport.exception;

public class SecurityAccessDeniedException extends RuntimeException {
    public SecurityAccessDeniedException(String message) {
        super(message);
    }
}
