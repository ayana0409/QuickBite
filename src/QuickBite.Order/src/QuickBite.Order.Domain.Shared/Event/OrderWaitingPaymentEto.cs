using System;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted onto Kafka topic "order-events" when an order status is changed to WaitingPayment.
/// Serves as a trigger for Payment Service to start payment process.
/// </summary>
[EventName("order.waiting-payment")]
public class OrderWaitingPaymentEto
{
    public Guid EventId { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }

    public decimal TotalAmount { get; set; }
    
    public string Currency { get; set; } = "VND";

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
