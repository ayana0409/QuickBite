using System.Threading.Tasks;

namespace QuickBite.Order.Infrastructure.Kafka.Producers;

public interface IKafkaProducer
{
    Task PublishAsync(string topic, string key, string payload);
}
