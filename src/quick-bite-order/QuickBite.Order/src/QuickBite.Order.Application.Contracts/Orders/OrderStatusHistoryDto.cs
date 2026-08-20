using System;

namespace QuickBite.Order.Orders;

public class OrderStatusHistoryDto
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public string? FromStatus { get; set; }

    public string ToStatus { get; set; } = string.Empty;

    public string? Reason { get; set; }

    public string ChangedBy { get; set; } = string.Empty;

    public DateTime ChangedAt { get; set; }
}
