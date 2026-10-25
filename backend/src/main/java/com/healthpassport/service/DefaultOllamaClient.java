package com.healthpassport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthpassport.config.OllamaProperties;
import com.healthpassport.exception.AiServiceUnavailableException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DefaultOllamaClient implements OllamaClient {

    private final OllamaProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DefaultOllamaClient(OllamaProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(properties.getConnectTimeoutMs()))
            .build();
    }

    @Override
    public boolean isAvailable() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(properties.getBaseUrl().replaceAll("/+$", "") + "/api/tags"))
                .timeout(Duration.ofMillis(properties.getConnectTimeoutMs()))
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String generateSummary(String systemPrompt, String userPrompt) {
        String url = properties.getBaseUrl().replaceAll("/+$", "") + "/api/generate";

        Map<String, Object> bodyMap = new HashMap<>();
        bodyMap.put("model", properties.getModel());
        bodyMap.put("system", systemPrompt);
        bodyMap.put("prompt", userPrompt);
        bodyMap.put("stream", false);

        Map<String, Object> options = new HashMap<>();
        options.put("temperature", 0.1);
        bodyMap.put("options", options);

        try {
            String requestJson = objectMapper.writeValueAsString(bodyMap);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                throw new AiServiceUnavailableException(
                    "Ollama model '" + properties.getModel() + "' is not installed. Please run 'ollama pull " + properties.getModel() + "' on your system."
                );
            }

            if (response.statusCode() != 200) {
                throw new AiServiceUnavailableException(
                    "Ollama service returned error status " + response.statusCode() + ". Check that Ollama is healthy and model is loaded."
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode responseField = root.get("response");
            if (responseField == null || responseField.asText().isBlank()) {
                throw new AiServiceUnavailableException("Ollama returned an empty response for the health record.");
            }

            return responseField.asText();
        } catch (AiServiceUnavailableException e) {
            throw e;
        } catch (java.net.http.HttpConnectTimeoutException | java.net.ConnectException e) {
            throw new AiServiceUnavailableException(
                "Unable to connect to local Ollama service at " + properties.getBaseUrl() + ". Ensure Ollama is running ('ollama serve')."
            );
        } catch (java.net.http.HttpTimeoutException e) {
            throw new AiServiceUnavailableException(
                "Ollama timed out while generating the health summary. The model may still be loading into memory."
            );
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new AiServiceUnavailableException("Communication error with local Ollama service: " + e.getMessage());
        }
    }

    @Override
    public OllamaProperties getProperties() {
        return properties;
    }
}
