using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted by Payment Service when payment authorization succeeds.
/// Published to "fulfillment-events" topic.
/// </summary>
[EventName("payment.authorized")]
public class PaymentAuthorizedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public Guid PaymentId { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; }
}
