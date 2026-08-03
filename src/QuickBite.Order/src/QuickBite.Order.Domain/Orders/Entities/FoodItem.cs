using System;
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

    private FoodItem() { }

    public FoodItem(Guid id, string name, decimal price) : base(id)
    {
        Name = name;
        Price = price;
    }

    public void UpdateInfo(string name, decimal price)
    {
        Name = name;
        Price = price;
    }
}
