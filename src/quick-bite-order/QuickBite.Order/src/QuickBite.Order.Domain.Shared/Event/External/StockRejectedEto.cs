using System;
using System.Text.Json.Serialization;
using Volo.Abp.EventBus;

namespace QuickBite.Order.Domain.Shared.Event.External;

/// <summary>
/// Event emitted by Inventory Service when stock is insufficient.
/// Published to "fulfillment-events" topic.
/// </summary>
[EventName("stock.rejected")]
public class StockRejectedEto
{
    [JsonPropertyName("eventId")]
    public Guid EventId { get; set; }

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "stock.rejected";

    [JsonPropertyName("orderId")]
    public Guid OrderId { get; set; }

    [JsonPropertyName("foodItemId")]
    public Guid? FoodItemId { get; set; }

    [JsonPropertyName("quantity")]
    public int? Quantity { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("correlationId")]
    public Guid CorrelationId { get; set; }

    [JsonPropertyName("occurredAt")]
    public DateTime OccurredAt { get; set; }
}
