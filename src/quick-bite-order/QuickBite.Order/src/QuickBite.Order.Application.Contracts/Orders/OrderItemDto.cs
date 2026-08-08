using System;
using System.Collections.Generic;
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

    public string? SelectedVariantName { get; set; }

    public List<string> SelectedToppings { get; set; } = new();
}