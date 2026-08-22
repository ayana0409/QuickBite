using System;
using System.Collections.Generic;

namespace QuickBite.Order.Orders;

/// <summary>
/// Aggregated statistics for system-wide Admin analytics dashboard.
/// </summary>
public class AdminOrderStatisticsDto
{
    public int TotalOrders { get; set; }
    public int TodayOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal RevenueToday { get; set; }
    public int ActiveRestaurantsCount { get; set; }

    public List<RevenueDataPointDto> Revenue30Days { get; set; } = new();
    public List<OrderStatusCountDto> OrderStatusBreakdown { get; set; } = new();
}

/// <summary>
/// Breakdown count and percentage for a specific order status.
/// </summary>
public class OrderStatusCountDto
{
    public string Status { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
    public string Color { get; set; } = "#64748b";
}
