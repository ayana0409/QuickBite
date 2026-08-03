namespace QuickBite.Order.Domain.Shared.Event;

public class FoodVariantEto
{
    public string Name { get; set; } = string.Empty;
    public decimal PriceDelta { get; set; }
}

public class FoodToppingEto
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
