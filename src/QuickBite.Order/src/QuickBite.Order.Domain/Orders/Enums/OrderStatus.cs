namespace QuickBite.Order.Orders;

public enum OrderStatus
{
    Pending,
    Confirmed,
    Preparing,
    Delivering,
    Completed,
    Cancelled,
    Refunded
}