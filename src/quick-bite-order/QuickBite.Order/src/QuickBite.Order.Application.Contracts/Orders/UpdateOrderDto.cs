using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace QuickBite.Order.Orders;

public class UpdateOrderDto
{
    [Required]
    public DeliveryAddressDto DeliveryAddress { get; set; } = default!;

    [Required]
    [MinLength(1)]
    public List<CreateOrderItemDto> Items { get; set; } = [];
}
