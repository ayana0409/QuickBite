using QuickBite.Order.Domain.Enums;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace QuickBite.Order.Domain.Orders.AggregateRoots;

public class Order : FullAuditedAggregateRoot<Guid>
{
    public string OrderCode { get; private set; }

    public Guid CustomerId { get; private set; }

    public Guid RestaurantId { get; private set; }

    public OrderStatus Status { get; private set; }

    public int Version { get; private set; }

    public ICollection<OrderItem> OrderItems { get; private set; }

    public ICollection<OrderStatusHistory> StatusHistories { get; private set; }

    public decimal TotalAmount { get; private set; }

    public string Currency { get; private set; }

    public DeliveryAddress DeliveryAddress { get; private set; }

    public Guid CorrelationId { get; private set; }

    private Order()
    {
        OrderItems = new List<OrderItem>();
        StatusHistories = new List<OrderStatusHistory>();
    }

    /// <summary>
    /// Factory constructor – receives required initial creation parameters.
    /// Default Status = Pending, TotalAmount = 0, will be computed when items are added.
    /// </summary>
    public Order(
        Guid id,
        Guid customerId,
        Guid restaurantId,
        DeliveryAddress deliveryAddress,
        Guid? correlationId = null)
        : base(id)
    {
        CustomerId = customerId;
        RestaurantId = restaurantId;
        DeliveryAddress = Check.NotNull(deliveryAddress, nameof(deliveryAddress));
        CorrelationId = correlationId ?? Guid.NewGuid();

        Status = OrderStatus.Draft;
        Version = 0;
        TotalAmount = 0;
        Currency = "VND";

        OrderItems = new List<OrderItem>();
        StatusHistories = new List<OrderStatusHistory>();

        AddStatusHistory(null, OrderStatus.Draft, "Order created in draft status");
    }

    #region Domain behaviors

    public void SetOrderCode(string orderCode)
    {
        if (string.IsNullOrWhiteSpace(orderCode))
            throw new BusinessException("OrderCodeCannotBeEmpty");

        // Can only be set once
        if (!string.IsNullOrEmpty(OrderCode))
            throw new BusinessException("OrderCodeAlreadySet");

        OrderCode = orderCode;
    }

    public void Submit()
    {
        if (Status != OrderStatus.Draft)
        {
            throw new BusinessException(
                code: OrderDomainErrorCodes.CannotSubmitNonDraftOrder,
                message: "Không thể gửi đơn hàng không ở trạng thái Nháp (Draft)."
            ).WithData("CurrentStatus", Status);
        }

        if (!OrderItems.Any())
        {
            throw new BusinessException(
                code: OrderDomainErrorCodes.CannotSubmitEmptyOrder,
                message: "Không thể gửi đơn hàng chưa có sản phẩm nào."
            );
        }

        ChangeStatus(OrderStatus.Pending, "Order submitted by customer");
    }

    public void AddItem(OrderItem item)
    {
        Check.NotNull(item, nameof(item));

        EnsureIsDraft();

        item.SetOrderId(Id);
        OrderItems.Add(item);

        RecalculateTotalAmount();
    }

    public void ClearItems()
    {
        EnsureIsDraft();

        OrderItems.Clear();
        RecalculateTotalAmount();
    }

    public void SetDeliveryAddress(DeliveryAddress deliveryAddress)
    {
        EnsureIsDraft();

        DeliveryAddress = Check.NotNull(deliveryAddress, nameof(deliveryAddress));
    }

    /// <summary>
    /// Atomically updates delivery address and order items for a draft order.
    /// </summary>
    public void UpdateDetails(DeliveryAddress deliveryAddress, IEnumerable<OrderItem> newItems)
    {
        EnsureIsDraft();

        DeliveryAddress = Check.NotNull(deliveryAddress, nameof(deliveryAddress));
        OrderItems.Clear();
        foreach (var item in Check.NotNull(newItems, nameof(newItems)))
        {
            item.SetOrderId(Id);
            OrderItems.Add(item);
        }

        RecalculateTotalAmount();
    }

    public void Confirm()
    {
        EnsureCanConfirm();

        ChangeStatus(OrderStatus.Confirmed, "Order confirmed");
    }

    public void Cancel(string reason = null)
    {
        EnsureCanCancel();

        ChangeStatus(OrderStatus.Cancelled, reason ?? "Order cancelled");
    }

    /// <summary>
    /// Reverts an order from processing state (e.g. Pending/WaitingStock) back to Draft status (e.g. when stock is rejected).
    /// </summary>
    public void RevertToDraft(string reason = null)
    {
        if (Status == OrderStatus.Draft)
            return;

        ChangeStatus(OrderStatus.Draft, string.IsNullOrWhiteSpace(reason) ? "Order reverted to draft" : reason);
    }

    /// <summary>
    /// Controlled status transition. Only used for intermediate states
    /// (WaitingPayment, WaitingStock, Preparing, Delivering...).
    /// Do not use for Confirm / Cancel (use dedicated methods).
    /// </summary>
    public void UpdateStatus(OrderStatus newStatus)
    {
        if (newStatus == OrderStatus.Confirmed || newStatus == OrderStatus.Cancelled)
            throw new BusinessException("UseConfirmOrCancelMethodInstead", "Vui lòng sử dụng phương thức Confirm hoặc Cancel chuyên dụng.");

        EnsureValidTransition(newStatus);

        ChangeStatus(newStatus, $"Status changed to {newStatus}");
    }

    #endregion

    #region Private helpers

    private void EnsureIsDraft()
    {
        if (Status != OrderStatus.Draft)
        {
            throw new BusinessException(
                code: OrderDomainErrorCodes.CannotUpdateNonDraftOrder,
                message: "Không thể chỉnh sửa thông tin đơn hàng khi đơn đã vào quy trình xử lý. Chỉ được chỉnh sửa khi đơn ở trạng thái Nháp (Draft)."
            ).WithData("CurrentStatus", Status);
        }
    }

    private void RecalculateTotalAmount()
    {
        TotalAmount = OrderItems.Sum(x => x.Quantity * x.UnitPrice);
    }

    private void ChangeStatus(OrderStatus newStatus, string note)
    {
        if (Status == newStatus)
            return;

        var oldStatus = Status;
        Status = newStatus;
        Version++;
        AddStatusHistory(oldStatus, newStatus, note);
    }

    private void AddStatusHistory(OrderStatus? fromStatus, OrderStatus toStatus, string note)
    {
        StatusHistories.Add(new OrderStatusHistory(
            Guid.NewGuid(),
            Id,
            fromStatus,
            toStatus,
            note,
            ChangedBy.System));
    }

    private void EnsureCanConfirm()
    {
        if (Status != OrderStatus.WaitingPayment &&
            Status != OrderStatus.WaitingStock)
        {
            throw new BusinessException(
                code: OrderDomainErrorCodes.InvalidOrderStatus,
                message: "Trạng thái đơn hàng hiện tại không hợp lệ để xác nhận."
            );
        }
    }

    private void EnsureCanCancel()
    {
        var cancellableStatuses = new[]
        {
            OrderStatus.Draft,
            OrderStatus.Pending,
            OrderStatus.WaitingInventory,
            OrderStatus.WaitingPayment,
            OrderStatus.WaitingStock,
            OrderStatus.Confirmed,
            OrderStatus.Preparing
        };

        if (!cancellableStatuses.Contains(Status))
        {
            throw new BusinessException(
                code: OrderDomainErrorCodes.InvalidOrderStatus,
                message: $"Không thể hủy đơn hàng ở trạng thái '{Status}'."
            );
        }
    }

    private void EnsureValidTransition(OrderStatus newStatus)
    {
        // Simple state machine validation
        var allowed = Status switch
        {
            OrderStatus.Draft => new[]
            {
                OrderStatus.Pending,
                OrderStatus.Cancelled
            },
            OrderStatus.Pending => new[]
            {
                OrderStatus.Draft,
                OrderStatus.WaitingInventory,
                OrderStatus.WaitingPayment,
                OrderStatus.WaitingStock,
                OrderStatus.Cancelled
            },
            OrderStatus.WaitingInventory => new[]
            {
                OrderStatus.Draft,
                OrderStatus.WaitingPayment,
                OrderStatus.WaitingStock,
                OrderStatus.Cancelled
            },
            OrderStatus.WaitingPayment => new[]
            {
                OrderStatus.Draft,
                OrderStatus.WaitingStock,
                OrderStatus.Confirmed,
                OrderStatus.Cancelled
            },
            OrderStatus.WaitingStock => new[]
            {
                OrderStatus.Draft,
                OrderStatus.Confirmed,
                OrderStatus.Cancelled
            },
            OrderStatus.Confirmed => new[]
            {
                OrderStatus.Preparing,
                OrderStatus.Cancelled
            },
            OrderStatus.Preparing => new[]
            {
                OrderStatus.Delivering,
                OrderStatus.Cancelled
            },
            _ => Array.Empty<OrderStatus>()
        };

        if (!allowed.Contains(newStatus))
        {
            throw new BusinessException(
                code: OrderDomainErrorCodes.InvalidOrderStatus,
                message: $"Không thể chuyển trạng thái đơn hàng từ '{Status}' sang '{newStatus}'."
            )
            .WithData("Current", Status)
            .WithData("Target", newStatus);
        }
    }

    #endregion
}