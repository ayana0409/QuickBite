using System;
using System.Text.Json.Serialization;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event;

/// <summary>
/// Event emitted by Inventory Service when stock reservation succeeds.
/// Published to "fulfillment-events" topic.
/// </summary>
[EventName("stock.reserved")]
public class StockReservedEto
{
    [JsonPropertyName("eventId")]
    public Guid EventId { get; set; }

    [JsonPropertyName("orderId")]
    public Guid OrderId { get; set; }

    [JsonPropertyName("correlationId")]
    public Guid CorrelationId { get; set; }

    [JsonPropertyName("occurredAt")]
    public DateTime OccurredAt { get; set; }
}
