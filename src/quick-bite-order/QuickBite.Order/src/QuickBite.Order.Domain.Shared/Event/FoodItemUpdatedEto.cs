using System;
using System.Collections.Generic;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event Transfer Object received from Kafka when Catalog service creates/updates a FoodItem.
/// EventName must match the value emitted from NestJS: "food.item.synced" in topic "catalog-events".
/// </summary>
[EventName("food.item.synced")]
public class FoodItemUpdatedEto
{
    public Guid Id { get; set; }

    public string Name { get; set; }

    public decimal Price { get; set; }

    public List<FoodVariantEto> Variants { get; set; } = new();
    
    public List<FoodToppingEto> Toppings { get; set; } = new();
}
