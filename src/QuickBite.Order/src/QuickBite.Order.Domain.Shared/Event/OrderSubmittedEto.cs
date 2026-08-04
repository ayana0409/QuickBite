using System;
using System.Collections.Generic;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted when a customer submits/checkouts an order (transitions from Draft to Pending).
/// Triggers the Order Saga Orchestration process.
/// </summary>
[EventName("order.submitted")]
public class OrderSubmittedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public string OrderCode { get; set; }

    public Guid CustomerId { get; set; }

    public Guid RestaurantId { get; set; }

    public decimal TotalAmount { get; set; }

    public string Currency { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; }

    public List<OrderItemEto> Items { get; set; } = new();
}
