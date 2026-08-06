using System.ComponentModel.DataAnnotations;
using QuickBite.Order.Domain.Enums;

namespace QuickBite.Order.Orders;

public class UpdateOrderStatusDto
{
    [Required]
    public OrderStatus Status { get; set; }

    public string? Note { get; set; }
}
