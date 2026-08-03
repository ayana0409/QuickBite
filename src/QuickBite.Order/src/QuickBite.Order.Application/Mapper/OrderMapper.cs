using QuickBite.Order.Domain.Orders.AggregateRoots;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.ValueObjects;
using QuickBite.Order.Orders;
using Riok.Mapperly.Abstractions;
using Volo.Abp.Mapperly;
using System;
using System.Text.Json;

namespace QuickBite.Order.Mappers;

[Mapper]
public partial class OrderMapper : MapperBase<Domain.Orders.AggregateRoots.Order, OrderDto>
{
    [MapProperty(nameof(Domain.Orders.AggregateRoots.Order.OrderItems), nameof(OrderDto.Items))]
    public override partial OrderDto Map(Domain.Orders.AggregateRoots.Order source);

    [MapProperty(nameof(Domain.Orders.AggregateRoots.Order.OrderItems), nameof(OrderDto.Items))]
    public override partial void Map(Domain.Orders.AggregateRoots.Order source, OrderDto destination);

    public OrderItemDto MapOrderItem(OrderItem source)
    {
        var dto = MapOrderItemInternal(source);
        dto.TotalPrice = source.Quantity * source.UnitPrice;
        dto.SelectedToppings = string.IsNullOrEmpty(source.SelectedToppings) 
            ? new System.Collections.Generic.List<string>() 
            : JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(source.SelectedToppings);
        return dto;
    }

    [MapProperty(nameof(OrderItem.ItemName), nameof(OrderItemDto.FoodName))]
    [MapProperty(nameof(OrderItem.Sku), nameof(OrderItemDto.FoodItemId))]
    [MapperIgnoreTarget(nameof(OrderItemDto.TotalPrice))]
    [MapperIgnoreTarget(nameof(OrderItemDto.SelectedToppings))]
    private partial OrderItemDto MapOrderItemInternal(OrderItem source);

    [MapProperty(nameof(DeliveryAddress.FullName), nameof(DeliveryAddressDto.ReceiverName))]
    public partial DeliveryAddressDto MapDeliveryAddress(DeliveryAddress source);
}