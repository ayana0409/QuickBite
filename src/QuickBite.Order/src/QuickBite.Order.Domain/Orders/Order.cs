using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Orders;

public class Order : FullAuditedAggregateRoot<Guid>
{
    public string OrderCode { get; private set; }

    public Guid CustomerId { get; private set; }

    public Guid RestaurantId { get; private set; }

    public OrderStatus Status { get; private set; }

    public decimal TotalAmount { get; private set; }

    public string Currency { get; private set; }

    public DeliveryAddress DeliveryAddress { get; private set; }

    public Guid CorrelationId { get; private set; }

    public int Version { get; private set; }

    public ICollection<OrderItem> OrderItems { get; private set; }

    public ICollection<OrderStatusHistory> StatusHistories { get; private set; }

    private Order()
    {

    }

    public Order(
        Guid id,
        string orderCode,
        Guid customerId,
        Guid restaurantId,
        decimal totalAmount,
        string currency,
        DeliveryAddress deliveryAddress,
        Guid correlationId)
        : base(id)
    {
        OrderCode = orderCode;
        CustomerId = customerId;
        RestaurantId = restaurantId;
        TotalAmount = totalAmount;
        Currency = currency;
        DeliveryAddress = deliveryAddress;
        CorrelationId = correlationId;

        Status = OrderStatus.Pending;
        Version = 0;

        OrderItems = [];
        StatusHistories = [];
    }
}