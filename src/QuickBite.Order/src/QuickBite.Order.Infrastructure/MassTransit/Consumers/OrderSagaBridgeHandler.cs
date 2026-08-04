using MassTransit;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.Infrastructure.MassTransit.Consumers;

/// <summary>
/// Bridges events received from Kafka Cloud (via ABP IDistributedEventBus) directly into MassTransit State Machine.
/// </summary>
public class OrderSagaBridgeHandler :
    IDistributedEventHandler<OrderSubmittedEto>,
    IDistributedEventHandler<StockReservedEto>,
    IDistributedEventHandler<StockRejectedEto>,
    IDistributedEventHandler<PaymentAuthorizedEto>,
    IDistributedEventHandler<PaymentFailedEto>,
    ITransientDependency
{
    private readonly IPublishEndpoint _publishEndpoint;

    public OrderSagaBridgeHandler(IPublishEndpoint publishEndpoint)
    {
        _publishEndpoint = publishEndpoint;
    }

    public async Task HandleEventAsync(OrderSubmittedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(StockReservedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(StockRejectedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(PaymentAuthorizedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(PaymentFailedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }
}
