using System.Threading.Tasks;
using MassTransit;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.Infrastructure.MassTransit;

/// <summary>
/// MassTransit Publish Filter that routes outgoing State Machine commands/events to Kafka Cloud via ABP IDistributedEventBus.
/// </summary>
public class AbpKafkaPublishFilter<T> : IFilter<PublishContext<T>> where T : class
{
    private readonly IDistributedEventBus _distributedEventBus;

    public AbpKafkaPublishFilter(IDistributedEventBus distributedEventBus)
    {
        _distributedEventBus = distributedEventBus;
    }

    public async Task Send(PublishContext<T> context, IPipe<PublishContext<T>> next)
    {
        await _distributedEventBus.PublishAsync(context.Message);
        await next.Send(context);
    }

    public void Probe(ProbeContext context)
    {
        context.CreateFilterScope("abpKafkaPublishFilter");
    }
}
