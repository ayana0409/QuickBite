using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Confluent.Kafka;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace QuickBite.Order.HealthCheck;

public class KafkaHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public KafkaHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.Run(() =>
        {
            try
            {
                var bootstrapServers = _configuration["Kafka:Connections:Default"]
                    ?? _configuration["Kafka:Producer:BootstrapServers"];

                if (string.IsNullOrEmpty(bootstrapServers))
                {
                    return HealthCheckResult.Degraded("Kafka bootstrap servers not configured.");
                }

                var config = new AdminClientConfig
                {
                    BootstrapServers = bootstrapServers,
                    SocketTimeoutMs = 5000
                };

                var producerSection = _configuration.GetSection("Kafka:Producer");
                if (Enum.TryParse<SecurityProtocol>(producerSection["SecurityProtocol"], out var sp))
                    config.SecurityProtocol = sp;
                if (Enum.TryParse<SaslMechanism>(producerSection["SaslMechanism"], out var sm))
                    config.SaslMechanism = sm;

                config.SaslUsername = producerSection["SaslUsername"];
                config.SaslPassword = producerSection["SaslPassword"];

                if (bool.TryParse(producerSection["EnableSslCertificateVerification"], out var verify))
                    config.EnableSslCertificateVerification = verify;

                using var adminClient = new AdminClientBuilder(config).Build();
                var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(5));

                var brokers = metadata.Brokers.Select(b => $"{b.Host}:{b.Port}").ToList();

                var data = new Dictionary<string, object>
                {
                    ["brokers"] = brokers,
                    ["topic_count"] = metadata.Topics.Count
                };

                return HealthCheckResult.Healthy($"Kafka connection OK. Active brokers: {brokers.Count}.", data);
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("Kafka cluster connection failed.", ex);
            }
        }, cancellationToken);
    }
}
