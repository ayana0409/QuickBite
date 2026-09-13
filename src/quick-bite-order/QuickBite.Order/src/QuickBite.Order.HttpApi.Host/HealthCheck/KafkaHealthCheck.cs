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
    private static DateTime _lastCheckTime = DateTime.MinValue;
    private static HealthCheckResult _lastResult = HealthCheckResult.Healthy("Kafka connection initialized.");
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);
    private static readonly object _lock = new();

    public KafkaHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        lock (_lock)
        {
            if (DateTime.UtcNow - _lastCheckTime < CacheDuration)
            {
                return Task.FromResult(_lastResult);
            }
        }

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
                    SocketTimeoutMs = 3000
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
                var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(3));

                var brokers = metadata.Brokers.Select(b => $"{b.Host}:{b.Port}").ToList();

                var data = new Dictionary<string, object>
                {
                    ["brokers"] = brokers,
                    ["topic_count"] = metadata.Topics.Count
                };

                var result = HealthCheckResult.Healthy($"Kafka connection OK. Active brokers: {brokers.Count}.", data);
                lock (_lock)
                {
                    _lastCheckTime = DateTime.UtcNow;
                    _lastResult = result;
                }
                return result;
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Degraded("Kafka cluster connection degraded.", ex);
            }
        }, cancellationToken);
    }
}
