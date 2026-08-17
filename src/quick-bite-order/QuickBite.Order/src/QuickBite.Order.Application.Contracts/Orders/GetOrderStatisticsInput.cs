using System;
using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

/// <summary>
/// Input DTO for querying aggregated order & revenue statistics by restaurant ID.
/// </summary>
public class GetOrderStatisticsInput
{
    [Required]
    public Guid RestaurantId { get; set; }
}
