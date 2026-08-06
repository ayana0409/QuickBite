namespace QuickBite.Order;

public static class OrderDomainErrorCodes
{
    public const string OrderCannotBeNull = "Order:000001";

    public const string InvalidOrderStatus = "Order:000002";

    public const string CannotCancelCompletedOrder = "Order:000003";

    public const string CannotUpdateNonDraftOrder = "Order:000004";

    public const string CannotSubmitNonDraftOrder = "Order:000005";

    public const string CannotSubmitEmptyOrder = "Order:000006";
}
