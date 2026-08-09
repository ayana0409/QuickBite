package com.quickbite.inventory.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.DescribeClusterOptions;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaHealthIndicator {

    private final KafkaProperties kafkaProperties;

    public HealthCheckEntry check() {
        long startTime = System.currentTimeMillis();

        Map<String, Object> adminProps = kafkaProperties.buildAdminProperties(null);
        adminProps.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, "10000");
        adminProps.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, "10000");

        Object truststoreLoc = adminProps.get("ssl.truststore.location");
        if (truststoreLoc != null) {
            adminProps.put("ssl.truststore.location", resolveCaPemPath(truststoreLoc.toString()));
        }

        try (AdminClient adminClient = AdminClient.create(adminProps)) {
            var clusterResult = adminClient.describeCluster(new DescribeClusterOptions().timeoutMs(10000));
            int nodeCount = clusterResult.nodes().get(10, TimeUnit.SECONDS).size();
            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> data = new HashMap<>();
            data.put("node_count", nodeCount);

            return HealthCheckEntry.builder()
                    .status("Healthy")
                    .description("Kafka connection OK. Active brokers: " + nodeCount + ".")
                    .data(data)
                    .duration_ms(duration)
                    .exception(null)
                    .build();
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.warn("Kafka health check failed: {}", e.getMessage());
            return HealthCheckEntry.builder()
                    .status("Unhealthy")
                    .description("Kafka cluster connection failed.")
                    .data(null)
                    .duration_ms(duration)
                    .exception(e.getMessage() != null ? e.getMessage() : e.getClass().getName())
                    .build();
        }
    }

    private String resolveCaPemPath(String configuredLocation) {
        if (configuredLocation == null || configuredLocation.isBlank()) {
            return configuredLocation;
        }
        File f = new File(configuredLocation);
        if (f.exists()) {
            return f.getAbsolutePath();
        }
        try {
            ClassPathResource resource = new ClassPathResource("ca.pem");
            if (resource.exists()) {
                try {
                    return resource.getFile().getAbsolutePath();
                } catch (Exception e) {
                    File tempFile = File.createTempFile("ca-truststore-", ".pem");
                    tempFile.deleteOnExit();
                    try (InputStream is = resource.getInputStream();
                         FileOutputStream os = new FileOutputStream(tempFile)) {
                        is.transferTo(os);
                    }
                    return tempFile.getAbsolutePath();
                }
            }
        } catch (Exception ignored) {}
        return configuredLocation;
    }
}
