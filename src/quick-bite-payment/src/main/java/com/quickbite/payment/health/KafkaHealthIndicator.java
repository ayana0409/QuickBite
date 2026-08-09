package com.quickbite.payment.health;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.DescribeClusterOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.listener.MessageListenerContainer;
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

    @Autowired(required = false)
    private KafkaListenerEndpointRegistry kafkaListenerEndpointRegistry;

    private AdminClient adminClient;

    private HealthCheckEntry cachedEntry;
    private long lastCheckTime = 0;

    public synchronized HealthCheckEntry check() {
        long now = System.currentTimeMillis();
        if (cachedEntry != null && (now - lastCheckTime) < 3000) {
            return cachedEntry;
        }

        long startTime = System.currentTimeMillis();

        // 1. Check active Spring Kafka Listener Containers FIRST (< 1ms)
        boolean listenerRunning = false;
        int activeContainers = 0;
        if (kafkaListenerEndpointRegistry != null) {
            for (MessageListenerContainer container : kafkaListenerEndpointRegistry.getListenerContainers()) {
                if (container.isRunning()) {
                    listenerRunning = true;
                    activeContainers++;
                }
            }
        }

        if (listenerRunning || (kafkaListenerEndpointRegistry != null && kafkaListenerEndpointRegistry.isRunning())) {
            long duration = System.currentTimeMillis() - startTime;
            Map<String, Object> data = new HashMap<>();
            data.put("active_listeners", activeContainers);

            cachedEntry = HealthCheckEntry.builder()
                    .status("Healthy")
                    .description("Kafka listeners active and running. Active containers: " + activeContainers + ".")
                    .data(data)
                    .duration_ms(duration)
                    .exception(null)
                    .build();
            lastCheckTime = System.currentTimeMillis();
            return cachedEntry;
        }

        // 2. Fallback to AdminClient describeCluster if no active listeners are registered
        try {
            AdminClient client = getOrCreateAdminClient();
            var clusterResult = client.describeCluster(new DescribeClusterOptions().timeoutMs(2000));
            int nodeCount = clusterResult.nodes().get(2, TimeUnit.SECONDS).size();
            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> data = new HashMap<>();
            data.put("node_count", nodeCount);

            cachedEntry = HealthCheckEntry.builder()
                    .status("Healthy")
                    .description("Kafka connection OK. Active brokers: " + nodeCount + ".")
                    .data(data)
                    .duration_ms(duration)
                    .exception(null)
                    .build();
            lastCheckTime = System.currentTimeMillis();
            return cachedEntry;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.warn("Kafka health check failed: {}", e.getMessage());
            closeAdminClient();

            cachedEntry = HealthCheckEntry.builder()
                    .status("Unhealthy")
                    .description("Kafka cluster connection failed.")
                    .data(null)
                    .duration_ms(duration)
                    .exception(e.getMessage() != null ? e.getMessage() : e.getClass().getName())
                    .build();
            lastCheckTime = System.currentTimeMillis();
            return cachedEntry;
        }
    }

    private synchronized AdminClient getOrCreateAdminClient() {
        if (adminClient == null) {
            Map<String, Object> adminProps = kafkaProperties.buildAdminProperties(null);
            adminProps.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, "2000");
            adminProps.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, "2000");

            Object truststoreLoc = adminProps.get("ssl.truststore.location");
            if (truststoreLoc != null) {
                adminProps.put("ssl.truststore.location", resolveCaPemPath(truststoreLoc.toString()));
            }
            adminClient = AdminClient.create(adminProps);
        }
        return adminClient;
    }

    private synchronized void closeAdminClient() {
        if (adminClient != null) {
            try {
                adminClient.close();
            } catch (Exception ignored) {}
            adminClient = null;
        }
    }

    @PreDestroy
    public void cleanup() {
        closeAdminClient();
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
