using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Inbox;

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
}