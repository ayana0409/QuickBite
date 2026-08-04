using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted by Inventory Service when stock is insufficient.
/// Published to "fulfillment-events" topic.
/// </summary>
[EventName("stock.rejected")]
public class StockRejectedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public Guid CorrelationId { get; set; }

    public string Reason { get; set; }

    public DateTime OccurredAt { get; set; }
}
