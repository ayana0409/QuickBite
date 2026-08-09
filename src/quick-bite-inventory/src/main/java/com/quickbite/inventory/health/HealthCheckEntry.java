package com.quickbite.inventory.health;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthCheckEntry {
    private String status;
    private String description;
    private Object data;
    private double duration_ms;
    private String exception;
}
