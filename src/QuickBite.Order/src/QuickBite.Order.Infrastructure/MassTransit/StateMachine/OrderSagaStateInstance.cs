using System;
using MassTransit;

namespace QuickBite.Order.Infrastructure.MassTransit.StateMachine;

/// <summary>
/// State Machine Instance state record managed by MassTransit Saga persistence.
/// </summary>
public class OrderSagaStateInstance : SagaStateMachineInstance, ISagaVersion
{
    public Guid CorrelationId { get; set; }

    public string CurrentState { get; set; } = string.Empty;

    public Guid OrderId { get; set; }

    public Guid CustomerId { get; set; }

    public decimal TotalAmount { get; set; }

    public bool StockReserved { get; set; }

    public bool PaymentAuthorized { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public string ItemsJson { get; set; } = string.Empty;

    public int Version { get; set; }
}
