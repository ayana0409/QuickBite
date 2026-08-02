using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Services;
using AggregateRoots = QuickBite.Order.Domain.Orders.AggregateRoots.Order;
namespace QuickBite.Order.Orders;

public class OrderManager : DomainService, IOrderManager
{
    private readonly IOrderRepository _orderRepository;

    public OrderManager(
        IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<AggregateRoots> CreateAsync(
        Guid customerId,
        Guid restaurantId,
        DeliveryAddress deliveryAddress,
        List<OrderItem> orderItems,
        Guid? correlationId = null)
    {
        var order = new AggregateRoots(
            GuidGenerator.Create(),
            customerId,
            restaurantId,
            deliveryAddress,
            correlationId);

        foreach (var item in orderItems)
        {
            order.AddItem(item);
        }

        order.SetOrderCode(GenerateOrderCode());

        return await Task.FromResult(order);
    }

    public Task ConfirmAsync(AggregateRoots order)
    {
        order.Confirm();
        return Task.CompletedTask;
    }

    public Task CancelAsync(AggregateRoots order)
    {
        order.Cancel();
        return Task.CompletedTask;
    }

    public Task UpdateStatusAsync(AggregateRoots order, OrderStatus status)
    {
        order.UpdateStatus(status);
        return Task.CompletedTask;
    }

    public string GenerateOrderCode()
    {
        return $"QB-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
    }

}