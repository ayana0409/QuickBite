using System;
using System.Threading.Tasks;
using Confluent.Kafka;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Volo.Abp.DependencyInjection;

namespace QuickBite.Order.Infrastructure.Kafka.Producers;

public class KafkaProducer : IKafkaProducer, ITransientDependency
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<KafkaProducer> _logger;

    public KafkaProducer(IConfiguration configuration, ILogger<KafkaProducer> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task PublishAsync(string topic, string key, string payload)
    {
        var bootstrapServers = _configuration["Kafka:Connections:Default:BootstrapServers"]
                               ?? _configuration["Kafka:BootstrapServers"]
                               ?? "localhost:9092";

        var config = new ProducerConfig
        {
            BootstrapServers = bootstrapServers,
            Acks = Acks.All,
            EnableIdempotence = true
        };

        try
        {
            using var producer = new ProducerBuilder<string, string>(config).Build();
            var message = new Message<string, string>
            {
                Key = key ?? Guid.NewGuid().ToString(),
                Value = payload
            };

            var result = await producer.ProduceAsync(topic, message);
            _logger.LogInformation(
                "[Kafka Producer] Successfully published event to topic '{Topic}' [Partition: {Partition}, Offset: {Offset}]",
                topic, result.Partition.Value, result.Offset.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Kafka Producer] Failed to publish event to topic '{Topic}'", topic);
            throw;
        }
    }
}
