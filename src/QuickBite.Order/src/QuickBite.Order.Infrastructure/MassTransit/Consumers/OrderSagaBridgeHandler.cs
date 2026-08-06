using System;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.Infrastructure.MassTransit.Consumers;

/// <summary>
/// Bridges events received locally or via distributed bus into MassTransit State Machine.
/// Handles StockRejectedEto locally by reverting the corresponding order to Draft state,
/// and publishes OrderRevertedToDraftEto onto Kafka topic "order-events" for Notification Service.
/// </summary>
public class OrderSagaBridgeHandler :
    IDistributedEventHandler<OrderSubmittedEto>,
    ILocalEventHandler<StockReservedEto>,
    ILocalEventHandler<StockRejectedEto>,
    ILocalEventHandler<PaymentAuthorizedEto>,
    ILocalEventHandler<PaymentFailedEto>,
    ITransientDependency
{
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderManager _orderManager;
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly ILogger<OrderSagaBridgeHandler> _logger;

    public OrderSagaBridgeHandler(
        IPublishEndpoint publishEndpoint,
        IOrderRepository orderRepository,
        IOrderManager orderManager,
        IDistributedEventBus distributedEventBus,
        ILogger<OrderSagaBridgeHandler> logger)
    {
        _publishEndpoint = publishEndpoint;
        _orderRepository = orderRepository;
        _orderManager = orderManager;
        _distributedEventBus = distributedEventBus;
        _logger = logger;
    }

    public async Task HandleEventAsync(OrderSubmittedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(StockReservedEto eventData)
    {
        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order != null)
        {
            await _orderManager.UpdateStatusAsync(order, OrderStatus.WaitingPayment);
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

        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(StockRejectedEto eventData)
    {
        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order != null)
        {
            // Only revert if order is still in a revertible processing state.
            // Prevent stale outbox stock.rejected messages from reverting an order
            // that has already progressed further (e.g., stock reserved, payment authorized).
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

                // Still forward to MassTransit so Saga state machine can handle/ignore properly
                await _publishEndpoint.Publish(eventData);
                return;
            }

            string reason = !string.IsNullOrWhiteSpace(eventData.Reason)
                ? eventData.Reason
                : "Sản phẩm trong kho không đủ đáp ứng (Stock rejected).";

            await _orderManager.RevertToDraftAsync(order, reason);
            await _orderRepository.UpdateAsync(order, autoSave: true);

            // Publish OrderRevertedToDraftEto onto Kafka "order-events" topic via ABP Distributed Event Bus (Outbox)
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

        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(PaymentAuthorizedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(PaymentFailedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }
}
