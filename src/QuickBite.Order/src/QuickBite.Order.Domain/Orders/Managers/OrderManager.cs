using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using System;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Services;
using AggregateRoots = QuickBite.Order.Domain.Order.AggregateRoots.Order;
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
        AggregateRoots order)
    {
        if (order is null)
        {
            throw new BusinessException(
                OrderDomainErrorCodes.OrderCannotBeNull);
        }

        order.SetOrderCode(GenerateOrderCode());
        order.UpdateStatus(OrderStatus.Pending);

        return order;
    }

    public Task ConfirmAsync(
        AggregateRoots order)
    {
        if (order.Status != OrderStatus.WaitingPayment &&
            order.Status != OrderStatus.WaitingStock)
        {
            throw new BusinessException(
                OrderDomainErrorCodes.InvalidOrderStatus);
        }

        order.Confirm();

        return Task.CompletedTask;
    }

    public Task CancelAsync(
        AggregateRoots order)
    {
        if (order.Status == OrderStatus.Completed)
        {
            throw new BusinessException(
                OrderDomainErrorCodes.CannotCancelCompletedOrder);
        }

        order.Cancel();

        return Task.CompletedTask;
    }

    public Task UpdateStatusAsync(
        AggregateRoots order,
        OrderStatus status)
    {
        order.UpdateStatus(status);

        return Task.CompletedTask;
    }

    public string GenerateOrderCode()
    {
        return $"QB-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
    }

}