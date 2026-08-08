using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Command emitted by Order Saga to Payment Service to authorize payment for an order.
/// Published to "order-events" topic.
/// </summary>
[EventName("saga.payment.requested")]
public class PaymentAuthorizationRequestedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public Guid CustomerId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; }
}
