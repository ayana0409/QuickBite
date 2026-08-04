using System;
using System.Linq;
using MassTransit;
using QuickBite.Order.Domain.Shared.Event;

namespace QuickBite.Order.Infrastructure.MassTransit.StateMachine;

/// <summary>
/// MassTransit Saga State Machine for Order Orchestration.
/// Coordinates: OrderSubmitted -> ReservingStock -> AuthorizingPayment -> Confirmed (or Compensation -> Cancelled).
/// </summary>
public class OrderStateMachine : MassTransitStateMachine<OrderSagaStateInstance>
{
    // States
    public State ReservingStock { get; private set; }
    public State AuthorizingPayment { get; private set; }
    public State Confirmed { get; private set; }
    public State Compensating { get; private set; }

    // Events
    public Event<OrderSubmittedEto> OrderSubmitted { get; private set; }
    public Event<StockReservedEto> StockReserved { get; private set; }
    public Event<StockRejectedEto> StockRejected { get; private set; }
    public Event<PaymentAuthorizedEto> PaymentAuthorized { get; private set; }
    public Event<PaymentFailedEto> PaymentFailed { get; private set; }

    public OrderStateMachine()
    {
        InstanceState(x => x.CurrentState);

        Event(() => OrderSubmitted, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => StockReserved, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => StockRejected, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => PaymentAuthorized, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => PaymentFailed, x => x.CorrelateById(context => context.Message.CorrelationId));

        Initially(
            When(OrderSubmitted)
                .Then(context =>
                {
                    context.Saga.OrderId = context.Message.OrderId;
                    context.Saga.CustomerId = context.Message.CustomerId;
                    context.Saga.TotalAmount = context.Message.TotalAmount;
                    context.Saga.SubmittedAt = context.Message.OccurredAt;
                })
                .Publish(context => new StockReservationRequestedEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = context.Saga.OrderId,
                    CorrelationId = context.Saga.CorrelationId,
                    OccurredAt = DateTime.UtcNow,
                    Items = context.Message.Items.Select(i => new StockItemReservationEto
                    {
                        FoodItemId = i.FoodItemId,
                        Quantity = i.Quantity
                    }).ToList()
                })
                .TransitionTo(ReservingStock)
        );

        During(ReservingStock,
            Ignore(OrderSubmitted),
            When(StockReserved)
                .Then(context => context.Saga.StockReserved = true)
                .Publish(context => new PaymentAuthorizationRequestedEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = context.Saga.OrderId,
                    CustomerId = context.Saga.CustomerId,
                    Amount = context.Saga.TotalAmount,
                    Currency = "VND",
                    CorrelationId = context.Saga.CorrelationId,
                    OccurredAt = DateTime.UtcNow
                })
                .TransitionTo(AuthorizingPayment),

            When(StockRejected)
                .Publish(context => new OrderCancelledEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = context.Saga.OrderId,
                    CorrelationId = context.Saga.CorrelationId,
                    Reason = context.Message.Reason ?? "Stock reservation rejected by inventory",
                    OccurredAt = DateTime.UtcNow
                })
                .Finalize()
        );

        During(AuthorizingPayment,
            Ignore(OrderSubmitted),
            When(PaymentAuthorized)
                .Then(context => context.Saga.PaymentAuthorized = true)
                .Publish(context => new OrderConfirmedEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = context.Saga.OrderId,
                    CorrelationId = context.Saga.CorrelationId,
                    OccurredAt = DateTime.UtcNow
                })
                .TransitionTo(Confirmed)
                .Finalize(),

            When(PaymentFailed)
                .TransitionTo(Compensating)
                .Publish(context => new StockReleaseRequestedEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = context.Saga.OrderId,
                    CorrelationId = context.Saga.CorrelationId,
                    Reason = context.Message.Reason ?? "Payment authorization failed",
                    OccurredAt = DateTime.UtcNow
                })
                .Publish(context => new OrderCancelledEto
                {
                    EventId = Guid.NewGuid(),
                    OrderId = context.Saga.OrderId,
                    CorrelationId = context.Saga.CorrelationId,
                    Reason = context.Message.Reason ?? "Payment authorization failed",
                    OccurredAt = DateTime.UtcNow
                })
                .Finalize()
        );

        SetCompletedWhenFinalized();
    }
}
