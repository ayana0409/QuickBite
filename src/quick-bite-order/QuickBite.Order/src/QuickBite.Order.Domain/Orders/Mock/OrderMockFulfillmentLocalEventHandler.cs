using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.BackgroundJobs;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus;
using Volo.Abp.EventBus.Distributed;
using Volo.Abp.EventBus.Local;
using Volo.Abp.Uow;

namespace QuickBite.Order.Domain.Orders.Mock;

public class OrderMockFulfillmentLocalEventHandler :
    ILocalEventHandler<OrderConfirmedEto>,
    ITransientDependency
{
    private readonly IOrderRepository _orderRepository;
    private readonly IBackgroundJobManager _backgroundJobManager;
    private readonly IConfiguration _configuration;
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly ILogger<OrderMockFulfillmentLocalEventHandler> _logger;

    public OrderMockFulfillmentLocalEventHandler(
        IOrderRepository orderRepository,
        IBackgroundJobManager backgroundJobManager,
        IConfiguration configuration,
        IDistributedEventBus distributedEventBus,
        ILogger<OrderMockFulfillmentLocalEventHandler> logger)
    {
        _orderRepository = orderRepository;
        _backgroundJobManager = backgroundJobManager;
        _configuration = configuration;
        _distributedEventBus = distributedEventBus;
        _logger = logger;
    }

    [UnitOfWork]
    public virtual async Task HandleEventAsync(OrderConfirmedEto eventData)
    {
        var options = MockFulfillmentOptions.FromEnvOrConfig(_configuration);
        _logger.LogInformation("[MockFulfillmentHandler] Received OrderConfirmedEto for OrderId: {OrderId}. Enabled={Enabled}", eventData.OrderId, options.Enabled);

        if (!options.Enabled)
        {
            return;
        }

        _logger.LogInformation("[MockFulfillmentHandler] Processing OrderId: {OrderId}", eventData.OrderId);

        var order = await _orderRepository.FindAsync(eventData.OrderId);
        if (order == null)
        {
            _logger.LogWarning("[MockFulfillmentHandler] Order not found: {OrderId}", eventData.OrderId);
            return;
        }

        if (order.Status != OrderStatus.Confirmed && order.Status != OrderStatus.Preparing)
        {
            _logger.LogWarning("[MockFulfillmentHandler] Order {OrderId} status is '{Status}', expected Confirmed.", order.Id, order.Status);
            return;
        }

        // 1. Immediately transition to Preparing
        if (order.Status == OrderStatus.Confirmed)
        {
            order.UpdateStatus(OrderStatus.Preparing);
            await _orderRepository.UpdateAsync(order, autoSave: true);
            _logger.LogInformation("[MockFulfillmentHandler] Order {OrderId} status updated to PREPARING.", order.Id);

            // Publish OrderPreparingEto
            var preparingEto = new OrderPreparingEto
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
            await _distributedEventBus.PublishAsync(preparingEto);
        }

        // 2. Calculate preparation time: total item quantity * options.PreparationTimePerItemSeconds
        int totalQuantity = order.OrderItems.Sum(x => x.Quantity);
        if (totalQuantity <= 0) totalQuantity = 1;

        int prepDelaySeconds = totalQuantity * options.PreparationTimePerItemSeconds;
        _logger.LogInformation(
            "[MockFulfillmentHandler] Order {OrderId} total items: {Qty}. Preparation delay: {PrepSeconds}s.",
            order.Id, totalQuantity, prepDelaySeconds);

        // 3. Enqueue SimulateOrderDeliveryJob with delay
        await _backgroundJobManager.EnqueueAsync(
            new SimulateOrderDeliveryJobArgs { OrderId = order.Id },
            delay: TimeSpan.FromSeconds(prepDelaySeconds)
        );
    }
}
