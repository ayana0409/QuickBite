using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Compensation command emitted by Order Saga to Inventory Service to release reserved stock when payment fails.
/// Published to "order-events" topic.
/// </summary>
[EventName("saga.stock.release.requested")]
public class StockReleaseRequestedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public Guid CorrelationId { get; set; }

    public string Reason { get; set; }

    public DateTime OccurredAt { get; set; }
}
