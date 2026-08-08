using System;
using System.Collections.Generic;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

[EventName("order.created")]
public class OrderCreatedEto
{
    public Guid EventId { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public string OrderCode { get; set; }

    public Guid CustomerId { get; set; }

    public Guid RestaurantId { get; set; }

    public decimal TotalAmount { get; set; }

    public string Currency { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    public List<OrderItemEto> Items { get; set; } = new();
}

public class OrderItemEto
{
    public Guid FoodItemId { get; set; }

    public string ItemName { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public string SelectedVariantName { get; set; }

    public string SelectedToppings { get; set; }
}
