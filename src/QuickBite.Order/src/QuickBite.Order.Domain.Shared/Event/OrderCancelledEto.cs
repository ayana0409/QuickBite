using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

[EventName("order.cancelled")]
public class OrderCancelledEto
{
    public Guid EventId { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public string Reason { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
