using System;
using Volo.Abp.Domain.Entities;

namespace QuickBite.Order.Orders;

public class OrderItem : Entity<Guid>
{
    public Guid OrderId { get; private set; }

    public string Sku { get; private set; }

    public string ItemName { get; private set; }

    public int Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    private OrderItem()
    {

    }

    public OrderItem(
        Guid id,
        Guid orderId,
        string sku,
        string itemName,
        int quantity,
        decimal unitPrice)
        : base(id)
    {
        OrderId = orderId;
        Sku = sku;
        ItemName = itemName;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }
}