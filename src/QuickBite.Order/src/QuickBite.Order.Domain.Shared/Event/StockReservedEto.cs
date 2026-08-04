using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted by Inventory Service when stock reservation succeeds.
/// Published to "fulfillment-events" topic.
/// </summary>
[EventName("stock.reserved")]
public class StockReservedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; }
}
