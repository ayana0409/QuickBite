package com.quickbite.payment.health;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final DatabaseHealthIndicator dbHealthIndicator;
    private final KafkaHealthIndicator kafkaHealthIndicator;
    private final SystemResourcesHealthIndicator sysHealthIndicator;

    @GetMapping({"/health", "/api/health", "/api/v1/health", "/v1/health"})

    public ResponseEntity<HealthResponse> getHealth() {
        long startTime = System.currentTimeMillis();

        CompletableFuture<HealthCheckEntry> dbFuture = CompletableFuture.supplyAsync(dbHealthIndicator::check);
        CompletableFuture<HealthCheckEntry> kafkaFuture = CompletableFuture.supplyAsync(kafkaHealthIndicator::check);
        CompletableFuture<HealthCheckEntry> sysFuture = CompletableFuture.supplyAsync(sysHealthIndicator::check);

        CompletableFuture.allOf(dbFuture, kafkaFuture, sysFuture).join();

        Map<String, HealthCheckEntry> entries = new LinkedHashMap<>();
        entries.put("database", dbFuture.join());
        entries.put("kafka", kafkaFuture.join());
        entries.put("system_resources", sysFuture.join());

        String overallStatus = "Healthy";
        boolean hasUnhealthy = entries.values().stream()
                .anyMatch(entry -> "Unhealthy".equalsIgnoreCase(entry.getStatus()));
        boolean hasDegraded = entries.values().stream()
                .anyMatch(entry -> "Degraded".equalsIgnoreCase(entry.getStatus()));

        if (hasUnhealthy) {
            overallStatus = "Unhealthy";
        } else if (hasDegraded) {
            overallStatus = "Degraded";
        }

        long totalDuration = System.currentTimeMillis() - startTime;

        HealthResponse response = HealthResponse.builder()
                .status(overallStatus)
                .total_duration_ms(totalDuration)
                .timestamp(Instant.now().toString())
                .entries(entries)
                .build();

        HttpStatus httpStatus = "Unhealthy".equals(overallStatus)
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.OK;

        return ResponseEntity.status(httpStatus).body(response);
    }
}
