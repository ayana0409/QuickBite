using System.Threading.Tasks;
using MassTransit;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.EventBus.Local;

namespace QuickBite.Order.Infrastructure.MassTransit.Consumers;

/// <summary>
/// MassTransit Kafka Consumer for topic "fulfillment-events".
/// Consumes StockRejectedEto and StockReservedEto events and forwards them locally to ABP's ILocalEventBus,
/// preventing accidental re-publishing back out to Kafka "order-events".
/// </summary>
public class FulfillmentEventConsumer :
    IConsumer<StockRejectedEto>,
    IConsumer<StockReservedEto>
{
    private readonly ILocalEventBus _localEventBus;
    private readonly ILogger<FulfillmentEventConsumer> _logger;

    public FulfillmentEventConsumer(
        ILocalEventBus localEventBus,
        ILogger<FulfillmentEventConsumer> logger)
    {
        _localEventBus = localEventBus;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<StockRejectedEto> context)
    {
        _logger.LogInformation("[FulfillmentEventConsumer] Received 'stock.rejected' from Kafka for OrderId: {OrderId}, Reason: {Reason}",
            context.Message.OrderId, context.Message.Reason);

        // Dispatch locally in-process so OrderSagaBridgeHandler handles it without re-publishing to Kafka order-events
        await _localEventBus.PublishAsync(context.Message);

        _logger.LogInformation("[FulfillmentEventConsumer] Successfully dispatched StockRejectedEto to local event bus.");
    }

    public async Task Consume(ConsumeContext<StockReservedEto> context)
    {
        _logger.LogInformation("[FulfillmentEventConsumer] Received 'stock.reserved' from Kafka for OrderId: {OrderId}",
            context.Message.OrderId);

        await _localEventBus.PublishAsync(context.Message);

        _logger.LogInformation("[FulfillmentEventConsumer] Successfully dispatched StockReservedEto to local event bus.");
    }
}
