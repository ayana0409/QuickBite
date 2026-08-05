using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

[EventName("order.confirmed")]
public class OrderConfirmedEto
{
    public Guid EventId { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    public System.Collections.Generic.List<OrderItemEto> Items { get; set; } = new();
}
