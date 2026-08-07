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
using Volo.Abp.EventBus.Distributed;
using Volo.Abp.Uow;

namespace QuickBite.Order.Domain.Orders.Mock;

public class SimulateOrderDeliveryJob : AsyncBackgroundJob<SimulateOrderDeliveryJobArgs>, ITransientDependency
{
    private readonly IOrderRepository _orderRepository;
    private readonly IBackgroundJobManager _backgroundJobManager;
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SimulateOrderDeliveryJob> _logger;

    private static readonly Random _random = new Random();

    public SimulateOrderDeliveryJob(
        IOrderRepository orderRepository,
        IBackgroundJobManager backgroundJobManager,
        IDistributedEventBus distributedEventBus,
        IConfiguration configuration,
        ILogger<SimulateOrderDeliveryJob> logger)
    {
        _orderRepository = orderRepository;
        _backgroundJobManager = backgroundJobManager;
        _distributedEventBus = distributedEventBus;
        _configuration = configuration;
        _logger = logger;
    }

    [UnitOfWork]
    public override async Task ExecuteAsync(SimulateOrderDeliveryJobArgs args)
    {
        _logger.LogInformation("[MockFulfillmentJob] Running SimulateOrderDeliveryJob for OrderId: {OrderId}", args.OrderId);

        var order = await _orderRepository.FindAsync(args.OrderId);
        if (order == null)
        {
            _logger.LogWarning("[MockFulfillmentJob] Order not found: {OrderId}", args.OrderId);
            return;
        }

        if (order.Status != OrderStatus.Preparing)
        {
            _logger.LogInformation("[MockFulfillmentJob] Order {OrderId} status is '{Status}', expected Preparing. Skipping delivery simulation.", order.Id, order.Status);
            return;
        }

        // 1. Transition status to Delivering
        order.UpdateStatus(OrderStatus.Delivering);
        await _orderRepository.UpdateAsync(order, autoSave: true);
        _logger.LogInformation("[MockFulfillmentJob] Order {OrderId} status updated to DELIVERING.", order.Id);

        // 2. Publish OrderDeliveringEto to distributed event bus
        var eventEto = new OrderDeliveringEto
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

        // 3. Random distance between 2.0 and 6.0 km
        double distanceKm = _random.NextDouble() * (6.0 - 2.0) + 2.0;
        var options = MockFulfillmentOptions.FromEnvOrConfig(_configuration);
        int deliveryDelaySeconds = (int)Math.Round(distanceKm * options.DeliveryTimePerKmSeconds);
        if (deliveryDelaySeconds <= 0) deliveryDelaySeconds = 1;

        _logger.LogInformation(
            "[MockFulfillmentJob] Order {OrderId} simulated distance: {Distance:F2} km. Delivery delay: {Delay}s.",
            order.Id, distanceKm, deliveryDelaySeconds);

        // 4. Enqueue SimulateOrderCompletedJob with calculated delay
        await _backgroundJobManager.EnqueueAsync(
            new SimulateOrderCompletedJobArgs { OrderId = order.Id },
            delay: TimeSpan.FromSeconds(deliveryDelaySeconds)
        );
    }
}
