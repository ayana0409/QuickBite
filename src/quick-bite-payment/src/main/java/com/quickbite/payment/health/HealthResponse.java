package com.quickbite.payment.health;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthResponse {
    private String status;
    private double total_duration_ms;
    private String timestamp;
    private Map<String, HealthCheckEntry> entries;
}
