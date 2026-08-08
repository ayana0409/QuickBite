using System;
using System.Collections.Generic;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Command emitted by Order Saga to Inventory Service to reserve stock for an order.
/// Published to "order-events" topic.
/// </summary>
[EventName("saga.stock.reservation.requested")]
public class StockReservationRequestedEto
{
    public Guid EventId { get; set; }

    public Guid OrderId { get; set; }

    public Guid CorrelationId { get; set; }

    public DateTime OccurredAt { get; set; }

    public List<StockItemReservationEto> Items { get; set; } = new();
}

public class StockItemReservationEto
{
    public Guid FoodItemId { get; set; }

    public int Quantity { get; set; }
}
