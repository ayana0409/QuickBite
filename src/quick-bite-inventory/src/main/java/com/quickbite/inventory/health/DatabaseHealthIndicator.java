package com.quickbite.inventory.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseHealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    public HealthCheckEntry check() {
        long startTime = System.currentTimeMillis();
        try {
            jdbcTemplate.execute("SELECT 1");
            long duration = System.currentTimeMillis() - startTime;
            return HealthCheckEntry.builder()
                    .status("Healthy")
                    .description("PostgreSQL database connection is healthy.")
                    .data(null)
                    .duration_ms(duration)
                    .exception(null)
                    .build();
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Database health check failed", e);
            return HealthCheckEntry.builder()
                    .status("Unhealthy")
                    .description("PostgreSQL database connection failed.")
                    .data(null)
                    .duration_ms(duration)
                    .exception(e.getMessage())
                    .build();
        }
    }
}
