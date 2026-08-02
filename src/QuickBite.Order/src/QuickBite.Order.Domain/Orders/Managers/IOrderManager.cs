using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.ValueObjects;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace QuickBite.Order.Domain.Orders.Managers;

public interface IOrderManager
{
    Task<AggregateRoots.Order> CreateAsync(
        Guid customerId,
        Guid restaurantId,
        DeliveryAddress deliveryAddress,
        List<OrderItem> orderItems,
        Guid? correlationId = null);

    Task ConfirmAsync(AggregateRoots.Order order);

    Task CancelAsync(AggregateRoots.Order order);

    Task UpdateStatusAsync(
        AggregateRoots.Order order,
        OrderStatus status);

    string GenerateOrderCode();
}