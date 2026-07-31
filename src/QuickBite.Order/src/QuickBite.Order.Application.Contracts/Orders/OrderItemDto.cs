using System;
using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class OrderItemDto
{
    public Guid FoodItemId { get; set; }

    [Required]
    public string FoodName { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }
}