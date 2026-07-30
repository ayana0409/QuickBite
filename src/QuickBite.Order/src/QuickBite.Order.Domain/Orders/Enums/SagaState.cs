namespace QuickBite.Order.Orders;

public enum SagaState
{
    Initial,

    ReservingStock,

    AuthorizingPayment,

    Confirmed,

    AwaitingRestaurantAcceptance,

    Compensating,

    CompletedSaga,

    Cancelled
}