using System;
using System.Collections.Generic;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

[EventName("order.preparing")]
public class OrderPreparingEto
{
    public Guid EventId { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    public List<OrderItemEto> Items { get; set; } = new();
}
