using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Domain.Outbox;

public class OutboxMessage : CreationAuditedAggregateRoot<Guid>
{
    public Guid EventId { get; private set; }

    public string EventType { get; private set; }

    public string Topic { get; private set; }

    public string PartitionKey { get; private set; }

    public Guid CorrelationId { get; private set; }

    public string Payload { get; private set; }

    public string Status { get; private set; }

    public DateTime? ProcessedAt { get; private set; }

    public int RetryCount { get; private set; }

    public string ErrorReason { get; private set; }

    private OutboxMessage()
    {
    }

    public OutboxMessage(
        Guid id,
        Guid eventId,
        string eventType,
        string topic,
        string partitionKey,
        Guid correlationId,
        string payload)
        : base(id)
    {
        EventId = eventId;
        EventType = eventType;
        Topic = topic;
        PartitionKey = partitionKey;
        CorrelationId = correlationId;
        Payload = payload;
        Status = "Pending";
        RetryCount = 0;
    }

    public void MarkAsProcessed()
    {
        Status = "Processed";
        ProcessedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string reason)
    {
        Status = "Failed";
        ErrorReason = reason;
        RetryCount++;
    }

    public void IncrementRetry()
    {
        RetryCount++;
    }
}