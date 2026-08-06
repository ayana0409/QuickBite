using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Shared.Event;
using QuickBite.Order.Domain.Shared.Event.External;
using Volo.Abp.EventBus.Local;

namespace QuickBite.Order.Infrastructure.MassTransit.Consumers;

/// <summary>
/// A single Kafka consumer for topic "fulfillment-events" that reads raw JSON strings,
/// inspects the "eventType" field, and routes to the correct local handler.
/// This prevents cross-type deserialization where stock.reserved is accidentally
/// deserialized into StockRejectedEto because they share common fields (orderId, correlationId).
/// </summary>
public class FulfillmentRawConsumer : IConsumer<FulfillmentRawMessage>
{
    private readonly ILocalEventBus _localEventBus;
    private readonly ILogger<FulfillmentRawConsumer> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    };

    public FulfillmentRawConsumer(
        ILocalEventBus localEventBus,
        ILogger<FulfillmentRawConsumer> logger)
    {
        _localEventBus = localEventBus;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<FulfillmentRawMessage> context)
    {
        var raw = context.Message;
        var eventType = raw.EventType?.ToLower()?.Trim();

        _logger.LogInformation("[FulfillmentRawConsumer] Received event '{EventType}' for OrderId: {OrderId}",
            eventType, raw.OrderId);

        switch (eventType)
        {
            case "stock.reserved":
                var reserved = new StockReservedEto
                {
                    EventId = raw.EventId,
                    OrderId = raw.OrderId,
                    CorrelationId = raw.CorrelationId,
                    OccurredAt = raw.OccurredAt
                };
                await _localEventBus.PublishAsync(reserved);
                _logger.LogInformation("[FulfillmentRawConsumer] Dispatched StockReservedEto for OrderId: {OrderId}", raw.OrderId);
                break;

            case "stock.rejected":
                var rejected = new StockRejectedEto
                {
                    EventId = raw.EventId,
                    OrderId = raw.OrderId,
                    FoodItemId = raw.FoodItemId,
                    Quantity = raw.Quantity,
                    Status = raw.Status,
                    Reason = raw.Reason,
                    CorrelationId = raw.CorrelationId,
                    OccurredAt = raw.OccurredAt
                };
                await _localEventBus.PublishAsync(rejected);
                _logger.LogInformation("[FulfillmentRawConsumer] Dispatched StockRejectedEto for OrderId: {OrderId}, Reason: {Reason}",
                    raw.OrderId, raw.Reason);
                break;

            default:
                _logger.LogWarning("[FulfillmentRawConsumer] Unknown eventType '{EventType}', skipping.", eventType);
                break;
        }
    }
}

/// <summary>
/// Envelope DTO for raw fulfillment-events messages.
/// Contains all possible fields from both stock.reserved and stock.rejected.
/// </summary>
public class FulfillmentRawMessage
{
    [JsonPropertyName("eventId")]
    public Guid EventId { get; set; }

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = string.Empty;

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
