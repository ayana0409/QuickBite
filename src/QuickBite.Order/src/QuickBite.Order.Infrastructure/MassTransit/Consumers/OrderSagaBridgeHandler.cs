using System;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Shared.Event;
using QuickBite.Order.Domain.Shared.Event.External;
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
    private readonly OrderFulfillmentManager _orderFulfillmentManager;
    private readonly ILogger<OrderSagaBridgeHandler> _logger;

    public OrderSagaBridgeHandler(
        IPublishEndpoint publishEndpoint,
        OrderFulfillmentManager orderFulfillmentManager,
        ILogger<OrderSagaBridgeHandler> logger)
    {
        _publishEndpoint = publishEndpoint;
        _orderFulfillmentManager = orderFulfillmentManager;
        _logger = logger;
    }

    public async Task HandleEventAsync(OrderSubmittedEto eventData)
    {
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(StockReservedEto eventData)
    {
        await _orderFulfillmentManager.ProcessStockReservedAsync(eventData);
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(StockRejectedEto eventData)
    {
        await _orderFulfillmentManager.ProcessStockRejectedAsync(eventData);
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(PaymentAuthorizedEto eventData)
    {
        await _orderFulfillmentManager.ProcessPaymentAuthorizedAsync(eventData);
        await _publishEndpoint.Publish(eventData);
    }

    public async Task HandleEventAsync(PaymentFailedEto eventData)
    {
        await _orderFulfillmentManager.ProcessPaymentFailedAsync(eventData);
        await _publishEndpoint.Publish(eventData);
    }
}
