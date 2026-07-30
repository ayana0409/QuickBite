using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Outbox;

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

    private OutboxMessage()
    {

    }
}