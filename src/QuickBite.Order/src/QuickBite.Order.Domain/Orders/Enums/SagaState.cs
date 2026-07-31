namespace QuickBite.Order.Domain.Enums;

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