using System.Threading.Tasks;
using MassTransit;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.EventBus.Distributed;
using Microsoft.Extensions.Logging;

namespace QuickBite.Order.Infrastructure.MassTransit.Consumers;

public class CatalogEventConsumer : IConsumer<FoodItemUpdatedEto>
{
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly ILogger<CatalogEventConsumer> _logger;

    public CatalogEventConsumer(
        IDistributedEventBus distributedEventBus,
        ILogger<CatalogEventConsumer> logger)
    {
        _distributedEventBus = distributedEventBus;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<FoodItemUpdatedEto> context)
    {
        _logger.LogInformation("[CatalogEventConsumer] Received FoodItemUpdatedEto from Kafka via MassTransit for FoodItemId: {FoodId}", context.Message.Id);

        // Publish to ABP's Distributed/Local Event Bus so that existing handlers (like FoodItemSyncEventHandler) will process it
        await _distributedEventBus.PublishAsync(context.Message);
        
        _logger.LogInformation("[CatalogEventConsumer] Successfully dispatched FoodItemUpdatedEto to ABP event bus.");
    }
}
