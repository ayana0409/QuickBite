using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class CreateOrderItemDto
{
    [Required]
    public Guid FoodItemId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    public string? SelectedVariantName { get; set; }

    public List<string> SelectedToppings { get; set; } = new();
}
