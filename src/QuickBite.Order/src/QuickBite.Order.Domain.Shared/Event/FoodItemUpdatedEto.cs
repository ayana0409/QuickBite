using System;
using System.Collections.Generic;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event Transfer Object nhận từ Kafka khi Catalog service tạo/cập nhật FoodItem.
/// EventName phải khớp với value emit từ NestJS: "food.item.synced" trong topic "catalog-events".
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
