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

        // 1. Transition status to Completed (Order domain automatically emits OrderCompletedEto via Outbox)
        order.UpdateStatus(OrderStatus.Completed);
        await _orderRepository.UpdateAsync(order, autoSave: true);
        _logger.LogInformation("[MockFulfillmentJob] Order {OrderId} status updated to COMPLETED.", order.Id);
    }
}
