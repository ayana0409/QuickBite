using System;
using Volo.Abp.Domain.Entities;

namespace QuickBite.Order.Domain.Orders.Entities;

public class OrderItem : Entity<Guid>
{
    public Guid OrderId { get; private set; }

    public string Sku { get; private set; }

    public string ItemName { get; private set; }

    public int Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public string? SelectedVariantName { get; private set; }

    public string SelectedToppings { get; private set; } = "[]";

    private OrderItem()
    {

    }

    public OrderItem(
        Guid id,
        string sku,
        string itemName,
        int quantity,
        decimal unitPrice,
        string? selectedVariantName = null,
        string selectedToppings = "[]")
        : base(id)
    {
        Sku = sku;
        ItemName = itemName;
        Quantity = quantity;
        UnitPrice = unitPrice;
        SelectedVariantName = selectedVariantName;
        SelectedToppings = selectedToppings;
    }
    public void SetOrderId(Guid orderId)
    {
        OrderId = orderId;
    }
}