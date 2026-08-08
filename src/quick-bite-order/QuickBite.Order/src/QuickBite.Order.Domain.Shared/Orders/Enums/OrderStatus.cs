namespace QuickBite.Order.Domain.Enums;

public enum OrderStatus
{
    Draft,
    Pending,
    WaitingInventory,
    WaitingPayment,
    WaitingStock,
    Confirmed,
    Preparing,
    Delivering,
    Completed,
    Cancelled,
    Refunded
}
