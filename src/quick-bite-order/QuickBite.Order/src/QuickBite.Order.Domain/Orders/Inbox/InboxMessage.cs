using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Domain.Inbox;

public class InboxMessage : CreationAuditedAggregateRoot<Guid>
{
    public Guid EventId { get; private set; }

    public string EventType { get; private set; }

    public string Consumer { get; private set; }

    public string Payload { get; private set; }

    public DateTime ProcessedAt { get; private set; }

    private InboxMessage()
    {
    }

    public InboxMessage(
        Guid id,
        Guid eventId,
        string eventType,
        string consumer,
        string payload)
        : base(id)
    {
        EventId = eventId;
        EventType = eventType;
        Consumer = consumer;
        Payload = payload;
        ProcessedAt = DateTime.UtcNow;
    }
}