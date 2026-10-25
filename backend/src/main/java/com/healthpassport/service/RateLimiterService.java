package com.healthpassport.service;

import com.healthpassport.exception.TooManyRequestsException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import org.springframework.stereotype.Service;

@Service
public class RateLimiterService {
    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 60;

    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<Instant>> attempts = new ConcurrentHashMap<>();

    public void checkRateLimit(String key) {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(WINDOW_SECONDS);

        ConcurrentLinkedQueue<Instant> timestamps = attempts.computeIfAbsent(key, k -> new ConcurrentLinkedQueue<>());

        // Evict expired timestamps
        while (!timestamps.isEmpty()) {
            Instant earliest = timestamps.peek();
            if (earliest != null && earliest.isBefore(cutoff)) {
                timestamps.poll();
            } else {
                break;
            }
        }

        if (timestamps.size() >= MAX_ATTEMPTS) {
            throw new TooManyRequestsException("Too many verification attempts. Please wait before trying again.");
        }

        timestamps.add(now);
    }

    public void reset(String key) {
        attempts.remove(key);
    }
}
