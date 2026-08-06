using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Shared.Event;
using QuickBite.Order.Domain.Shared.Event.External;
using Volo.Abp.Domain.Services;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.Domain.Orders.Managers;

public class OrderFulfillmentManager : DomainService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly ILogger<OrderFulfillmentManager> _logger;

    public OrderFulfillmentManager(
        IOrderRepository orderRepository,
        IDistributedEventBus distributedEventBus,
        ILogger<OrderFulfillmentManager> logger)
    {
        _orderRepository = orderRepository;
        _distributedEventBus = distributedEventBus;
        _logger = logger;
    }

    public async Task ProcessStockReservedAsync(StockReservedEto eventData)
    {
        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order != null)
        {
            order.UpdateStatus(OrderStatus.WaitingPayment);
            await _orderRepository.UpdateAsync(order, autoSave: true);

            var orderWaitingPaymentEto = new OrderWaitingPaymentEto
            {
                EventId = Guid.NewGuid(),
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                CustomerId = order.CustomerId,
                TotalAmount = order.TotalAmount,
                Currency = order.Currency,
                CorrelationId = order.CorrelationId,
                OccurredAt = DateTime.UtcNow
            };
            await _distributedEventBus.PublishAsync(orderWaitingPaymentEto);
        }
    }

    public async Task ProcessStockRejectedAsync(StockRejectedEto eventData)
    {
        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order != null)
        {
            var revertibleStatuses = new[]
            {
                OrderStatus.Pending,
                OrderStatus.WaitingInventory,
                OrderStatus.WaitingStock,
            };

            if (!Array.Exists(revertibleStatuses, s => s == order.Status))
            {
                _logger.LogWarning(
                    "[StockRejected] Skipping revert for OrderId: {OrderId}. Current status '{Status}' is not revertible. " +
                    "This may be a stale event from a previous attempt.",
                    order.Id, order.Status);
                return;
            }

            string reason = !string.IsNullOrWhiteSpace(eventData.Reason)
                ? eventData.Reason
                : "Sản phẩm trong kho không đủ đáp ứng (Stock rejected).";

            order.RevertToDraft(reason);
            await _orderRepository.UpdateAsync(order, autoSave: true);

            var orderRevertedEto = new OrderRevertedToDraftEto
            {
                EventId = Guid.NewGuid(),
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                CustomerId = order.CustomerId,
                RestaurantId = order.RestaurantId,
                Reason = reason,
                Code = "OUT_OF_STOCK",
                CorrelationId = order.CorrelationId,
                OccurredAt = DateTime.UtcNow
            };

            await _distributedEventBus.PublishAsync(orderRevertedEto);
        }
    }
}
