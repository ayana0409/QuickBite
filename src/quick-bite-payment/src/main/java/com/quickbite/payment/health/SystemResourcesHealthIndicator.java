package com.quickbite.payment.health;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class SystemResourcesHealthIndicator {

    public HealthCheckEntry check() {
        long startTime = System.currentTimeMillis();
        Runtime runtime = Runtime.getRuntime();

        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;

        Map<String, Object> data = new HashMap<>();
        data.put("working_set_mb", usedMemory / (1024 * 1024));
        data.put("heap_total_mb", totalMemory / (1024 * 1024));
        data.put("max_heap_mb", maxMemory / (1024 * 1024));

        long duration = System.currentTimeMillis() - startTime;

        return HealthCheckEntry.builder()
                .status("Healthy")
                .description("System resources operational")
                .data(data)
                .duration_ms(duration)
                .exception(null)
                .build();
    }
}
