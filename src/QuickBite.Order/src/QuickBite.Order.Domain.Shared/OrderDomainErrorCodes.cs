namespace QuickBite.Order;

public static class OrderDomainErrorCodes
{
    public const string OrderCannotBeNull = "Order:000001";

    public const string InvalidOrderStatus = "Order:000002";

    public const string CannotCancelCompletedOrder = "Order:000003";
}
