using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp;
using Volo.Abp.Domain.Entities;

namespace QuickBite.Order.Domain.Orders.Entities;

/// <summary>
/// Local replica of FoodItem from Catalog service.
/// This entity is read-only for the Order service — it is populated via Kafka event replication.
/// </summary>
public class FoodItem : Entity<Guid>
{
    public string Name { get; private set; }

    public decimal Price { get; private set; }

    public string Variants { get; private set; } = "[]";

    public string Toppings { get; private set; } = "[]";

    private FoodItem() { }

    public FoodItem(Guid id, string name, decimal price, string variants, string toppings) : base(id)
    {
        Name = name;
        Price = price;
        Variants = variants;
        Toppings = toppings;
    }

    public void UpdateInfo(string name, decimal price, string variants, string toppings)
    {
        Name = name;
        Price = price;
        Variants = variants;
        Toppings = toppings;
    }

    /// <summary>
    /// Calculates the final unit price based on the selected variant and toppings.
    /// Throws a BusinessException if any of the selections are invalid.
    /// </summary>
    public decimal CalculatePrice(string? selectedVariantName, List<string>? selectedToppings)
    {
        var variants = string.IsNullOrEmpty(Variants) 
            ? new List<FoodVariantEto>() 
            : JsonSerializer.Deserialize<List<FoodVariantEto>>(Variants);
        
        var toppings = string.IsNullOrEmpty(Toppings)
            ? new List<FoodToppingEto>()
            : JsonSerializer.Deserialize<List<FoodToppingEto>>(Toppings);

        decimal finalPrice = Price;

        // Apply selected variant pricing if present.
        if (!string.IsNullOrEmpty(selectedVariantName))
        {
            var variant = variants?.FirstOrDefault(v => v.Name == selectedVariantName);
            if (variant == null)
            {
                throw new BusinessException("QuickBite.Order:InvalidVariant")
                    .WithData("VariantName", selectedVariantName)
                    .WithData("FoodItemId", Id);
            }
            finalPrice += variant.PriceDelta;
        }

        // Apply selected toppings pricing if present.
        if (selectedToppings != null && selectedToppings.Any())
        {
            foreach (var toppingName in selectedToppings)
            {
                var topping = toppings?.FirstOrDefault(t => t.Name == toppingName);
                if (topping == null)
                {
                    throw new BusinessException("QuickBite.Order:InvalidTopping")
                        .WithData("ToppingName", toppingName)
                        .WithData("FoodItemId", Id);
                }
                finalPrice += topping.Price;
            }
        }

        return finalPrice;
    }
}
