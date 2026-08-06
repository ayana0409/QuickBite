using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using NSubstitute;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using QuickBite.Order.Domain.Shared.Event;
using QuickBite.Order.Domain.Shared.Event.External;
using Shouldly;
using Volo.Abp.EventBus.Distributed;
using Xunit;
using AggregateRoots = QuickBite.Order.Domain.Orders.AggregateRoots.Order;

namespace QuickBite.Order.Domain.Tests.Orders.Managers;

public class OrderFulfillmentManagerTests : OrderDomainTestBase<OrderDomainTestModule>
{
    private readonly OrderFulfillmentManager _manager;
    private readonly IOrderRepository _orderRepository;
    private readonly IDistributedEventBus _distributedEventBus;

    public OrderFulfillmentManagerTests()
    {
        _orderRepository = GetRequiredService<IOrderRepository>();
        _distributedEventBus = GetRequiredService<IDistributedEventBus>();
        _manager = GetRequiredService<OrderFulfillmentManager>();
    }

    [Fact]
    public async Task ProcessStockReservedAsync_Should_Update_Status_And_Publish_Event()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var correlationId = Guid.NewGuid();
        var order = new AggregateRoots(orderId, Guid.NewGuid(), Guid.NewGuid(), new DeliveryAddress("John Doe", "1234567890", "street", "ward", "district", "province", "note"), correlationId);
        order.SetOrderCode("QB-12345");
        
        typeof(AggregateRoots).GetProperty("Status")!.SetValue(order, OrderStatus.WaitingInventory);
        
        _orderRepository.FindAsync(orderId).Returns(Task.FromResult((AggregateRoots?)order));

        var eventData = new StockReservedEto { OrderId = orderId };

        // Act
        await _manager.ProcessStockReservedAsync(eventData);

        // Assert
        order.Status.ShouldBe(OrderStatus.WaitingPayment);
        await _orderRepository.Received(1).UpdateAsync(order, autoSave: true);
        
        await _distributedEventBus.Received(1).PublishAsync(
            Arg.Is<OrderWaitingPaymentEto>(e => 
                e.OrderId == orderId && 
                e.CorrelationId == correlationId &&
                e.OrderCode == "QB-12345"));
    }

    [Theory]
    [InlineData(OrderStatus.Pending)]
    [InlineData(OrderStatus.WaitingInventory)]
    [InlineData(OrderStatus.WaitingStock)]
    public async Task ProcessStockRejectedAsync_Should_Revert_To_Draft_For_Revertible_Statuses(OrderStatus initialStatus)
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var correlationId = Guid.NewGuid();
        var order = new AggregateRoots(orderId, Guid.NewGuid(), Guid.NewGuid(), new DeliveryAddress("John Doe", "1234567890", "street", "ward", "district", "province", "note"), correlationId);
        
        // Use reflection to bypass state machine validation for test setup
        typeof(AggregateRoots).GetProperty("Status")!.SetValue(order, initialStatus);

        _orderRepository.FindAsync(orderId).Returns(Task.FromResult((AggregateRoots?)order));

        var eventData = new StockRejectedEto 
        { 
            OrderId = orderId,
            Reason = "Not enough stock"
        };

        // Act
        await _manager.ProcessStockRejectedAsync(eventData);

        // Assert
        order.Status.ShouldBe(OrderStatus.Draft);
        order.StatusHistories.ShouldContain(h => h.Reason == "Not enough stock");

        await _orderRepository.Received(1).UpdateAsync(order, autoSave: true);
        
        await _distributedEventBus.Received(1).PublishAsync(
            Arg.Is<OrderRevertedToDraftEto>(e => 
                e.OrderId == orderId && 
                e.Reason == "Not enough stock" &&
                e.Code == "OUT_OF_STOCK"));
    }

    [Fact]
    public async Task ProcessStockRejectedAsync_Should_Skip_If_Status_Not_Revertible()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var order = new AggregateRoots(orderId, Guid.NewGuid(), Guid.NewGuid(), new DeliveryAddress("John Doe", "1234567890", "street", "ward", "district", "province", "note"), Guid.NewGuid());
        typeof(AggregateRoots).GetProperty("Status")!.SetValue(order, OrderStatus.Completed);

        _orderRepository.FindAsync(orderId).Returns(Task.FromResult((AggregateRoots?)order));

        var eventData = new StockRejectedEto { OrderId = orderId };

        // Act
        await _manager.ProcessStockRejectedAsync(eventData);

        // Assert
        order.Status.ShouldBe(OrderStatus.Completed); // Should remain unchanged
        await _orderRepository.DidNotReceive().UpdateAsync(Arg.Any<AggregateRoots>(), Arg.Any<bool>());
        await _distributedEventBus.DidNotReceive().PublishAsync(Arg.Any<OrderRevertedToDraftEto>());
    }
}
