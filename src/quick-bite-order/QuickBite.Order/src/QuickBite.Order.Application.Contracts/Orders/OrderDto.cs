using System;
using System.Collections.Generic;

namespace QuickBite.Order.Orders;

public class OrderDto
{
    public Guid Id { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }

    public Guid RestaurantId { get; set; }

    public string Status { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public DeliveryAddressDto DeliveryAddress { get; set; } = default!;

    public List<OrderItemDto> Items { get; set; } = [];

    public DateTime CreationTime { get; set; }
}