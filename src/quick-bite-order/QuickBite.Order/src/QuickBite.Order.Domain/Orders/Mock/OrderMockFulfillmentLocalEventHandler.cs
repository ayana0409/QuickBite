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

        // 1. Automatically transition Confirmed -> Preparing upon successful payment authorization
        // Order domain automatically emits OrderPreparingEto via Outbox
        if (order.Status == OrderStatus.Confirmed)
        {
            order.UpdateStatus(OrderStatus.Preparing);
            await _orderRepository.UpdateAsync(order, autoSave: true);
            _logger.LogInformation("[MockFulfillmentHandler] Order {OrderId} status automatically updated to PREPARING.", order.Id);
        }

        // 2. Check if automated simulation (Demo mode) is enabled in appsettings.json
        if (!options.Enabled)
        {
            _logger.LogInformation(
                "[MockFulfillmentHandler] Demo mode is DISABLED (MockFulfillment:Enabled=false). Order {OrderId} remains in PREPARING waiting for manual Merchant/Shipper action.",
                eventData.OrderId);
            return;
        }

        _logger.LogInformation("[MockFulfillmentHandler] Demo mode is ENABLED. Enqueuing automated simulation for OrderId: {OrderId}", eventData.OrderId);

        // 3. Calculate preparation time: total item quantity * options.PreparationTimePerItemSeconds
        int totalQuantity = order.OrderItems.Sum(x => x.Quantity);
        if (totalQuantity <= 0) totalQuantity = 1;

        int prepDelaySeconds = totalQuantity * options.PreparationTimePerItemSeconds;
        _logger.LogInformation(
            "[MockFulfillmentHandler] Order {OrderId} total items: {Qty}. Preparation delay: {PrepSeconds}s.",
            order.Id, totalQuantity, prepDelaySeconds);

        // 4. Enqueue SimulateOrderDeliveryJob with delay
        await _backgroundJobManager.EnqueueAsync(
            new SimulateOrderDeliveryJobArgs { OrderId = order.Id },
            delay: TimeSpan.FromSeconds(prepDelaySeconds)
        );
    }
}
