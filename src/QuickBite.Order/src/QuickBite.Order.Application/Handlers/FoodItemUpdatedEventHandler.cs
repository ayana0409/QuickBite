using System;
using System.Text.Json;
using System.Threading.Tasks;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.Handlers;

/// <summary>
/// Kafka consumer: listens to "food.item.synced" event from "catalog-events" topic.
/// ABP Native Inbox Pattern ensures this handler is NEVER called twice for the same message (idempotent).
/// </summary>
public class FoodItemUpdatedEventHandler
    : IDistributedEventHandler<FoodItemUpdatedEto>, ITransientDependency
{
    private readonly IRepository<FoodItem, Guid> _foodItemRepository;

    public FoodItemUpdatedEventHandler(IRepository<FoodItem, Guid> foodItemRepository)
    {
        _foodItemRepository = foodItemRepository;
    }

    public async Task HandleEventAsync(FoodItemUpdatedEto eventData)
    {
        var variantsJson = JsonSerializer.Serialize(eventData.Variants ?? new());
        var toppingsJson = JsonSerializer.Serialize(eventData.Toppings ?? new());

        // Check if FoodItem exists in the Order service local DB replica
        var food = await _foodItemRepository.FindAsync(eventData.Id);

        if (food == null)
        {
            // Not exists → Insert (synchronize new food item from Catalog)
            food = new FoodItem(eventData.Id, eventData.Name, eventData.Price, variantsJson, toppingsJson);
            await _foodItemRepository.InsertAsync(food);
        }
        else
        {
            // Exists → Update (synchronize updated name/price from Catalog)
            food.UpdateInfo(eventData.Name, eventData.Price, variantsJson, toppingsJson);
            await _foodItemRepository.UpdateAsync(food);
        }
    }
}
