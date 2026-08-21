using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class CreateOrderDto
{
    [Required]
    public Guid RestaurantId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    [Required]
    public DeliveryAddressDto DeliveryAddress { get; set; } = default!;

    public double? DeliveryLatitude { get; set; }

    public double? DeliveryLongitude { get; set; }

    [Required]
    [MinLength(1)]
    public List<CreateOrderItemDto> Items { get; set; } = [];
}