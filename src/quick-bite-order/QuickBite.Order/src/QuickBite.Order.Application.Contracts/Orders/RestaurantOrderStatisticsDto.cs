using System;
using System.Collections.Generic;

namespace QuickBite.Order.Orders;

public class RestaurantOrderStatisticsDto
{
    public OrderKpiSummaryDto KpiSummary { get; set; } = new();
    public List<RevenueDataPointDto> RevenueData { get; set; } = new();
    public List<CancelReasonDataPointDto> CancelReasonData { get; set; } = new();
    public List<RecentOrderSummaryDto> RecentOrders { get; set; } = new();
}

public class OrderKpiSummaryDto
{
    public decimal RevenueToday { get; set; }
    public decimal RevenueYesterday { get; set; }
    public string RevenueChange { get; set; } = "+0%";
    public bool IsRevenuePositive { get; set; } = true;

    public int OrdersToday { get; set; }
    public int OrdersYesterday { get; set; }
    public string OrdersChange { get; set; } = "+0%";
    public bool IsOrdersPositive { get; set; } = true;

    public double CancelRateToday { get; set; }
    public double CancelRateYesterday { get; set; }
    public string CancelRateChange { get; set; } = "-0%";
    public bool IsCancelRatePositive { get; set; } = true;

    public double AverageRating { get; set; } = 5.0;
    public string RatingChange { get; set; } = "+0.0";
    public int TotalReviews { get; set; } = 0;
}

public class RevenueDataPointDto
{
    public string Date { get; set; } = string.Empty;
    public string DayName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int OrdersCount { get; set; }
}

public class CancelReasonDataPointDto
{
    public string Name { get; set; } = string.Empty;
    public double Value { get; set; }
    public string Color { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class RecentOrderSummaryDto
{
    public Guid Id { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string ItemsSummary { get; set; } = string.Empty;
    public int ItemsCount { get; set; }
    public string Time { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Status { get; set; } = string.Empty;
}
