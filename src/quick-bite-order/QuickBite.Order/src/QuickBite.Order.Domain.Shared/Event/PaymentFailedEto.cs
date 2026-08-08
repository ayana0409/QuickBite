using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted by Payment Service when payment authorization fails.
/// Published to "fulfillment-events" topic.
/// </summary>
[EventName("payment.failed")]
public class PaymentFailedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public string Reason { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; }
}
