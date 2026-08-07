using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Inbox;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Shared.Event;
using QuickBite.Order.Domain.Shared.Event.External;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Volo.Abp.EventBus.Distributed;
using Volo.Abp.Uow;

namespace QuickBite.Order.Domain.Orders.Managers;

[UnitOfWork]
public class OrderFulfillmentManager : DomainService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly IRepository<InboxMessage, Guid> _inboxRepository;
    private readonly ILogger<OrderFulfillmentManager> _logger;

    public OrderFulfillmentManager(
        IOrderRepository orderRepository,
        IDistributedEventBus distributedEventBus,
        IRepository<InboxMessage, Guid> inboxRepository,
        ILogger<OrderFulfillmentManager> logger)
    {
        _orderRepository = orderRepository;
        _distributedEventBus = distributedEventBus;
        _inboxRepository = inboxRepository;
        _logger = logger;
    }

    public async Task ProcessStockReservedAsync(StockReservedEto eventData)
    {
        if (eventData.EventId != Guid.Empty && await _inboxRepository.AnyAsync(x => x.EventId == eventData.EventId))
        {
            _logger.LogInformation("[ProcessStockReserved] Skipping duplicate eventId: {EventId}", eventData.EventId);
            return;
        }

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

            if (eventData.EventId != Guid.Empty)
            {
                await _inboxRepository.InsertAsync(new InboxMessage(
                    Guid.NewGuid(),
                    eventData.EventId,
                    "stock.reserved",
                    "OrderFulfillmentManager",
                    System.Text.Json.JsonSerializer.Serialize(eventData)
                ), autoSave: true);
            }
        }
    }

    public async Task ProcessStockRejectedAsync(StockRejectedEto eventData)
    {
        if (eventData.EventId != Guid.Empty && await _inboxRepository.AnyAsync(x => x.EventId == eventData.EventId))
        {
            _logger.LogInformation("[ProcessStockRejected] Skipping duplicate eventId: {EventId}", eventData.EventId);
            return;
        }

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
                    "[StockRejected] Skipping revert for OrderId: {OrderId}. Current status '{Status}' is not revertible.",
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

            if (eventData.EventId != Guid.Empty)
            {
                await _inboxRepository.InsertAsync(new InboxMessage(
                    Guid.NewGuid(),
                    eventData.EventId,
                    "stock.rejected",
                    "OrderFulfillmentManager",
                    System.Text.Json.JsonSerializer.Serialize(eventData)
                ), autoSave: true);
            }
        }
    }

    public async Task ProcessPaymentAuthorizedAsync(PaymentAuthorizedEto eventData)
    {
        if (eventData.EventId != Guid.Empty && await _inboxRepository.AnyAsync(x => x.EventId == eventData.EventId))
        {
            _logger.LogInformation("[ProcessPaymentAuthorized] Skipping duplicate eventId: {EventId}", eventData.EventId);
            return;
        }

        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order != null)
        {
            if (order.Status == OrderStatus.WaitingPayment || order.Status == OrderStatus.WaitingStock)
            {
                order.Confirm();
                await _orderRepository.UpdateAsync(order, autoSave: true);
                _logger.LogInformation("[ProcessPaymentAuthorized] Order {OrderId} status updated to CONFIRMED.", order.Id);

                // Publish OrderConfirmedEto event on status change to Confirmed
                var orderConfirmedEto = new OrderConfirmedEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = order.Id,
                    CorrelationId = order.CorrelationId,
                    OccurredAt = DateTime.UtcNow,
                    Items = order.OrderItems.Select(x => new OrderItemEto
                    {
                        FoodItemId = x.Sku,
                        ItemName = x.ItemName,
                        Quantity = x.Quantity,
                        UnitPrice = x.UnitPrice,
                        SelectedVariantName = x.SelectedVariantName ?? string.Empty,
                        SelectedToppings = x.SelectedToppings
                    }).ToList()
                };
                await _distributedEventBus.PublishAsync(orderConfirmedEto);
                _logger.LogInformation("[ProcessPaymentAuthorized] Published OrderConfirmedEto for OrderId: {OrderId}", order.Id);

                if (eventData.EventId != Guid.Empty)
                {
                    await _inboxRepository.InsertAsync(new InboxMessage(
                        Guid.NewGuid(),
                        eventData.EventId,
                        "payment.authorized",
                        "OrderFulfillmentManager",
                        System.Text.Json.JsonSerializer.Serialize(eventData)
                    ), autoSave: true);
                }
            }
            else
            {
                _logger.LogWarning(
                    "[ProcessPaymentAuthorized] Skipping confirm for OrderId: {OrderId}. Current status '{Status}' is not valid for confirm.",
                    order.Id, order.Status);
            }
        }
    }

    public async Task ProcessPaymentFailedAsync(PaymentFailedEto eventData)
    {
        if (eventData.EventId != Guid.Empty && await _inboxRepository.AnyAsync(x => x.EventId == eventData.EventId))
        {
            _logger.LogInformation("[ProcessPaymentFailed] Skipping duplicate eventId: {EventId}", eventData.EventId);
            return;
        }

        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order != null)
        {
            string reason = !string.IsNullOrWhiteSpace(eventData.Reason) ? eventData.Reason : "Thanh toán thất bại.";
            order.Cancel(reason);
            await _orderRepository.UpdateAsync(order, autoSave: true);
            _logger.LogInformation("[ProcessPaymentFailed] Order {OrderId} cancelled due to failed payment. Reason: {Reason}", order.Id, reason);

            var orderCancelledEto = new OrderCancelledEto
            {
                EventId = Guid.NewGuid(),
                OrderId = order.Id,
                Reason = reason,
                CorrelationId = order.CorrelationId,
                OccurredAt = DateTime.UtcNow,
                Items = order.OrderItems.Select(x => new OrderItemEto
                {
                    FoodItemId = x.Sku,
                    ItemName = x.ItemName,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    SelectedVariantName = x.SelectedVariantName ?? string.Empty,
                    SelectedToppings = x.SelectedToppings
                }).ToList()
            };
            await _distributedEventBus.PublishAsync(orderCancelledEto);

            if (eventData.EventId != Guid.Empty)
            {
                await _inboxRepository.InsertAsync(new InboxMessage(
                    Guid.NewGuid(),
                    eventData.EventId,
                    "payment.failed",
                    "OrderFulfillmentManager",
                    System.Text.Json.JsonSerializer.Serialize(eventData)
                ), autoSave: true);
            }
        }
    }
}
