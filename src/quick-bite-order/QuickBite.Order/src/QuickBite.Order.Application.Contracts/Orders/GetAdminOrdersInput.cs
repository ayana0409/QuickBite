using System;
using Volo.Abp.Application.Dtos;

namespace QuickBite.Order.Orders;

/// <summary>
/// Input DTO for querying all orders across system for Admin supervision with search, status, and date range filters
/// </summary>
public class GetAdminOrdersInput : PagedAndSortedResultRequestDto
{
    public string? Search { get; set; }

    public string? Status { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }
}
