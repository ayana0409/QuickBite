using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using NSubstitute;
using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using QuickBite.Order.Domain.Shared.Event;
using QuickBite.Order.Orders;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.EventBus.Distributed;
using Xunit;
using AggregateRoots = QuickBite.Order.Domain.Orders.AggregateRoots.Order;

namespace QuickBite.Order.Application.Tests.Orders;

public class OrderAppServiceTests : OrderApplicationTestBase<OrderApplicationTestModule>
{
    private readonly IOrderAppService _orderAppService;
    private readonly IOrderRepository _orderRepository;
    private readonly IRepository<FoodItem, Guid> _foodItemRepository;
    private readonly IDistributedEventBus _distributedEventBus;

    public OrderAppServiceTests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _orderRepository = GetRequiredService<IOrderRepository>();
        _foodItemRepository = GetRequiredService<IRepository<FoodItem, Guid>>();
        _distributedEventBus = GetRequiredService<IDistributedEventBus>();
    }

    [Fact]
    public async Task CreateAsync_Should_Create_Draft_Order()
    {
        // Arrange
        var foodId = Guid.NewGuid();
        var foodItem = new FoodItem(foodId, "Pizza", 15.0m, "[]", "[]");
        _foodItemRepository.GetListAsync(Arg.Any<Expression<Func<FoodItem, bool>>>())
            .Returns(Task.FromResult(new List<FoodItem> { foodItem }));

        var input = new CreateOrderDto
        {
            CustomerId = Guid.NewGuid(),
            RestaurantId = Guid.NewGuid(),
            DeliveryAddress = new DeliveryAddressDto
            {
                ReceiverName = "John",
                PhoneNumber = "0987654321",
                AddressLine = "123 Street",
                Ward = "Ward A",
                District = "District B",
                Province = "City C",
                Note = "Fast delivery"
            },
            Items = new List<CreateOrderItemDto>
            {
                new CreateOrderItemDto
                {
                    FoodItemId = foodId,
                    Quantity = 2
                }
            }
        };

        // Act
        var result = await _orderAppService.CreateAsync(input);

        // Assert
        result.ShouldNotBeNull();
        result.CustomerId.ShouldBe(input.CustomerId);
        result.RestaurantId.ShouldBe(input.RestaurantId);
        result.Status.ShouldBe(OrderStatus.Draft.ToString());
        
        await _orderRepository.Received(1).InsertAsync(Arg.Any<AggregateRoots>(), autoSave: true);
    }

    [Fact]
    public async Task SubmitAsync_Should_Update_Status_To_Pending_And_Publish_Event()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var order = new AggregateRoots(
            orderId, 
            Guid.NewGuid(), 
            Guid.NewGuid(), 
            new DeliveryAddress("John", "0987654321", "123 St", "Ward", "Dist", "City", "Note"), 
            Guid.NewGuid());
        order.SetOrderCode("QB-10001");
        order.AddItem(new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "Pizza", 1, 15.0m));
        
        _orderRepository.GetAsync(orderId, includeDetails: true)
            .Returns(Task.FromResult(order));

        // Act
        await _orderAppService.SubmitAsync(orderId);

        // Assert
        order.Status.ShouldBe(OrderStatus.Pending);
        await _orderRepository.Received(1).UpdateAsync(order, autoSave: true);
        await _distributedEventBus.Received(1).PublishAsync(Arg.Is<OrderSubmittedEto>(e => e.OrderId == orderId));
    }

    [Fact]
    public async Task CancelAsync_Draft_Order_Should_Not_Publish_Cancelled_Event()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var order = new AggregateRoots(
            orderId, 
            Guid.NewGuid(), 
            Guid.NewGuid(), 
            new DeliveryAddress("John", "0987654321", "123 St", "Ward", "Dist", "City", "Note"), 
            Guid.NewGuid());
        
        _orderRepository.GetAsync(orderId, includeDetails: true)
            .Returns(Task.FromResult(order));

        // Act
        await _orderAppService.CancelAsync(orderId);

        // Assert
        order.Status.ShouldBe(OrderStatus.Cancelled);
        await _orderRepository.Received(1).UpdateAsync(order, autoSave: true);
        await _distributedEventBus.DidNotReceive().PublishAsync(Arg.Any<OrderCancelledEto>());
    }

    [Fact]
    public async Task CancelAsync_Processing_Order_Should_Publish_Cancelled_Event()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var order = new AggregateRoots(
            orderId, 
            Guid.NewGuid(), 
            Guid.NewGuid(), 
            new DeliveryAddress("John", "0987654321", "123 St", "Ward", "Dist", "City", "Note"), 
            Guid.NewGuid());
        order.AddItem(new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "Pizza", 1, 15.0m));
        
        // Transition to Pending first
        order.Submit();

        _orderRepository.GetAsync(orderId, includeDetails: true)
            .Returns(Task.FromResult(order));

        // Act
        await _orderAppService.CancelAsync(orderId);

        // Assert
        order.Status.ShouldBe(OrderStatus.Cancelled);
        await _orderRepository.Received(1).UpdateAsync(order, autoSave: true);
        await _distributedEventBus.Received(1).PublishAsync(Arg.Is<OrderCancelledEto>(e => e.OrderId == orderId));
    }
}
