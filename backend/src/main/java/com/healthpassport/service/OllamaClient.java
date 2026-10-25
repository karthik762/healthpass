package com.healthpassport.service;

public interface OllamaClient {
    boolean isAvailable();
    String generateSummary(String systemPrompt, String userPrompt);
    com.healthpassport.config.OllamaProperties getProperties();
}
