using QuickBite.Order.Domain.Enums;
using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Domain.Orders.Saga;

public class OrderSagaState : FullAuditedAggregateRoot<Guid>
{
    public Guid CorrelationId { get; private set; }

    public Guid OrderId { get; private set; }

    public SagaState CurrentState { get; private set; }

    public bool StockReserved { get; private set; }

    public bool PaymentAuthorized { get; private set; }

    public bool RestaurantAccepted { get; private set; }

    public DateTime? StepTimeoutAt { get; private set; }

    public DateTime? RestaurantAcceptDeadline { get; private set; }

    public int RetryCount { get; private set; }

    public string ConcurrencyStamp { get; set; }

    private OrderSagaState()
    {

    }

    public OrderSagaState(
        Guid id,
        Guid correlationId,
        Guid orderId)
        : base(id)
    {
        CorrelationId = correlationId;
        OrderId = orderId;

        CurrentState = SagaState.Initial;
        RetryCount = 0;

        ConcurrencyStamp = Guid.NewGuid().ToString();
    }
}