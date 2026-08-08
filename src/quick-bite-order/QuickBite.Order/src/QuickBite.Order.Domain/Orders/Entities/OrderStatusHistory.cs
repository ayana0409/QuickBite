using QuickBite.Order.Domain.Enums;
using System;
using Volo.Abp.Domain.Entities;

namespace QuickBite.Order.Domain.Orders.Entities;

public class OrderStatusHistory : Entity<Guid>
{
    public Guid OrderId { get; private set; }

    public OrderStatus? FromStatus { get; private set; }

    public OrderStatus ToStatus { get; private set; }

    public string? Reason { get; private set; }

    public ChangedBy ChangedBy { get; private set; }

    public DateTime ChangedAt { get; private set; }

    private OrderStatusHistory()
    {

    }

    public OrderStatusHistory(
        Guid id,
        Guid orderId,
        OrderStatus? fromStatus,
        OrderStatus toStatus,
        string? reason,
        ChangedBy changedBy)
        : base(id)
    {
        OrderId = orderId;
        FromStatus = fromStatus;
        ToStatus = toStatus;
        Reason = reason;
        ChangedBy = changedBy;
        ChangedAt = DateTime.UtcNow;
    }
}