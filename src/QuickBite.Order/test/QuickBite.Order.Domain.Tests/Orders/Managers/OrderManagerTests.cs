using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NSubstitute;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using QuickBite.Order.Orders;
using Shouldly;
using Xunit;

namespace QuickBite.Order.Domain.Tests.Orders.Managers;

public class OrderManagerTests : OrderDomainTestBase<OrderDomainTestModule>
{
    private readonly OrderManager _orderManager;
    private readonly IOrderRepository _orderRepository;

    public OrderManagerTests()
    {
        _orderRepository = GetRequiredService<IOrderRepository>();
        _orderManager = GetRequiredService<OrderManager>();
    }

    [Fact]
    public async Task Should_Create_Order_With_Items()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var restaurantId = Guid.NewGuid();
        var deliveryAddress = new DeliveryAddress("John Doe", "1234567890", "123 Main St", "Ward 1", "District 1", "Province", "Note");
        var orderItems = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "Burger", 2, 10.5m),
            new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "Fries", 1, 3.0m)
        };
        var correlationId = Guid.NewGuid();

        // Act
        var order = await _orderManager.CreateAsync(customerId, restaurantId, deliveryAddress, orderItems, correlationId);

        // Assert
        order.ShouldNotBeNull();
        order.CustomerId.ShouldBe(customerId);
        order.RestaurantId.ShouldBe(restaurantId);
        order.DeliveryAddress.ShouldBe(deliveryAddress);
        order.CorrelationId.ShouldBe(correlationId);
        order.OrderItems.Count.ShouldBe(2);
        order.TotalAmount.ShouldBe(10.5m * 2 + 3.0m * 1);
        order.OrderCode.ShouldStartWith("QB-");
    }
}
