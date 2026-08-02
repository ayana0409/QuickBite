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
    /// Factory constructor – chỉ nhận thông tin bắt buộc lúc tạo đơn.
    /// Status mặc định = Pending, TotalAmount = 0, sẽ được tính lại khi AddItem.
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

        Status = OrderStatus.Pending;
        Version = 0;
        TotalAmount = 0;
        Currency = "VND"; // hoặc lấy từ config / value object sau này

        OrderItems = new List<OrderItem>();
        StatusHistories = new List<OrderStatusHistory>();

        AddStatusHistory(OrderStatus.Pending, "Order created");
    }

    #region Domain behaviors

    public void SetOrderCode(string orderCode)
    {
        if (string.IsNullOrWhiteSpace(orderCode))
            throw new BusinessException("OrderCodeCannotBeEmpty");

        // Chỉ cho set 1 lần
        if (!string.IsNullOrEmpty(OrderCode))
            throw new BusinessException("OrderCodeAlreadySet");

        OrderCode = orderCode;
    }

    public void AddItem(OrderItem item)
    {
        Check.NotNull(item, nameof(item));

        // Chỉ cho thêm item khi còn Pending
        if (Status != OrderStatus.Pending)
            throw new BusinessException("CannotAddItemWhenOrderNotPending");

        item.SetOrderId(Id);
        OrderItems.Add(item);

        RecalculateTotalAmount();
    }

    public void ClearItems()
    {
        if (Status != OrderStatus.Pending)
            throw new BusinessException("CannotUpdateOrderNotPending");

        OrderItems.Clear();
        RecalculateTotalAmount();
    }

    public void SetDeliveryAddress(DeliveryAddress deliveryAddress)
    {
        if (Status != OrderStatus.Pending)
            throw new BusinessException("CannotUpdateOrderNotPending");

        DeliveryAddress = Check.NotNull(deliveryAddress, nameof(deliveryAddress));
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
    /// Transition có kiểm soát. Chỉ dùng cho các trạng thái trung gian
    /// (WaitingPayment, WaitingStock, Preparing, Delivering...).
    /// Không dùng để Confirm / Cancel (đã có method riêng).
    /// </summary>
    public void UpdateStatus(OrderStatus newStatus)
    {
        if (newStatus == OrderStatus.Confirmed || newStatus == OrderStatus.Cancelled)
            throw new BusinessException("UseConfirmOrCancelMethodInstead");

        EnsureValidTransition(newStatus);

        ChangeStatus(newStatus, $"Status changed to {newStatus}");
    }

    #endregion

    #region Private helpers

    private void RecalculateTotalAmount()
    {
        TotalAmount = OrderItems.Sum(x => x.Quantity * x.UnitPrice);
    }

    private void ChangeStatus(OrderStatus newStatus, string note)
    {
        if (Status == newStatus)
            return;

        Status = newStatus;
        Version++;
        AddStatusHistory(newStatus, note);
    }

    private void AddStatusHistory(OrderStatus status, string note)
    {
        // Giả sử OrderStatusHistory có constructor phù hợp
        StatusHistories.Add(new OrderStatusHistory(
            Guid.NewGuid(),
            Id,
            this.Status,
            status,
            note,
            ChangedBy.System));
    }

    private void EnsureCanConfirm()
    {
        // Theo logic trong Manager hiện tại
        if (Status != OrderStatus.WaitingPayment &&
            Status != OrderStatus.WaitingStock)
        {
            throw new BusinessException(
                OrderDomainErrorCodes.InvalidOrderStatus);
        }
    }

    private void EnsureCanCancel()
    {
        if (Status == OrderStatus.Completed)
        {
            throw new BusinessException(
                OrderDomainErrorCodes.CannotCancelCompletedOrder);
        }

        // Có thể bổ sung thêm: không cho cancel khi đang Delivering...
    }

    private void EnsureValidTransition(OrderStatus newStatus)
    {
        // Ví dụ rule đơn giản – bạn có thể mở rộng state machine sau
        var allowed = Status switch
        {
            OrderStatus.Pending => new[]
            {
                OrderStatus.WaitingPayment,
                OrderStatus.WaitingStock,
                OrderStatus.Cancelled
            },
            OrderStatus.WaitingPayment => new[]
            {
                OrderStatus.WaitingStock,
                OrderStatus.Confirmed,
                OrderStatus.Cancelled
            },
            OrderStatus.WaitingStock => new[]
            {
                OrderStatus.Confirmed,
                OrderStatus.Cancelled
            },
            OrderStatus.Confirmed => new[]
            {
                OrderStatus.Preparing,
                OrderStatus.Cancelled
            },
            // ... các stage khác
            _ => Array.Empty<OrderStatus>()
        };

        if (!allowed.Contains(newStatus))
        {
            throw new BusinessException(
                OrderDomainErrorCodes.InvalidOrderStatus)
                .WithData("Current", Status)
                .WithData("Target", newStatus);
        }
    }

    #endregion
}