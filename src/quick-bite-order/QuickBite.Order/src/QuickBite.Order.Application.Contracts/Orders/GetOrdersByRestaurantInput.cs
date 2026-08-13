using System;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace QuickBite.Order.Orders;

/// <summary>
/// Input DTO for querying orders by restaurant ID with status, search filter, and pagination
/// </summary>
public class GetOrdersByRestaurantInput : PagedAndSortedResultRequestDto
{
    [Required]
    public Guid RestaurantId { get; set; }

    public string? Status { get; set; }

    public string? Search { get; set; }
}
