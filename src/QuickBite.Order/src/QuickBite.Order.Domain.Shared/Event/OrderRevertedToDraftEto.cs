using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted onto Kafka topic "order-events" when an order is reverted back to Draft status
/// (e.g. due to stock rejection). Serves as notification trigger for Notification Service.
/// </summary>
[EventName("order.reverted-to-draft")]
public class OrderRevertedToDraftEto
{
    public Guid EventId { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }

    public Guid RestaurantId { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string Code { get; set; } = "OUT_OF_STOCK";

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
