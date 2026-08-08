using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.BackgroundJobs;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus.Distributed;
using Volo.Abp.Uow;

namespace QuickBite.Order.Domain.Orders.Mock;

public class SimulateOrderCompletedJob : AsyncBackgroundJob<SimulateOrderCompletedJobArgs>, ITransientDependency
{
    private readonly IOrderRepository _orderRepository;
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly ILogger<SimulateOrderCompletedJob> _logger;

    public SimulateOrderCompletedJob(
        IOrderRepository orderRepository,
        IDistributedEventBus distributedEventBus,
        ILogger<SimulateOrderCompletedJob> logger)
    {
        _orderRepository = orderRepository;
        _distributedEventBus = distributedEventBus;
        _logger = logger;
    }

    [UnitOfWork]
    public override async Task ExecuteAsync(SimulateOrderCompletedJobArgs args)
    {
        _logger.LogInformation("[MockFulfillmentJob] Running SimulateOrderCompletedJob for OrderId: {OrderId}", args.OrderId);

        var order = await _orderRepository.FindAsync(args.OrderId);
        if (order == null)
        {
            _logger.LogWarning("[MockFulfillmentJob] Order not found: {OrderId}", args.OrderId);
            return;
        }

        if (order.Status != OrderStatus.Delivering)
        {
            _logger.LogInformation("[MockFulfillmentJob] Order {OrderId} status is '{Status}', expected Delivering. Skipping completion simulation.", order.Id, order.Status);
            return;
        }

        // 1. Transition status to Completed
        order.UpdateStatus(OrderStatus.Completed);
        await _orderRepository.UpdateAsync(order, autoSave: true);
        _logger.LogInformation("[MockFulfillmentJob] Order {OrderId} status updated to COMPLETED.", order.Id);

        // 2. Publish OrderCompletedEto to distributed event bus (consumed by Inventory Service to deduct stock)
        var eventEto = new OrderCompletedEto
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
        await _distributedEventBus.PublishAsync(eventEto);
        _logger.LogInformation("[MockFulfillmentJob] Published OrderCompletedEto for OrderId: {OrderId}", order.Id);
    }
}
