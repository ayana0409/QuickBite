using QuickBite.Order.Domain.Enums;
using System.Threading.Tasks;

using AggregateRoots = QuickBite.Order.Domain.Order.AggregateRoots.Order;
namespace QuickBite.Order.Domain.Orders.Managers;

public interface IOrderManager
{
    Task<AggregateRoots> CreateAsync(AggregateRoots order);

    Task ConfirmAsync(AggregateRoots order);

    Task CancelAsync(AggregateRoots order);

    Task UpdateStatusAsync(
        AggregateRoots order,
        OrderStatus status);

    string GenerateOrderCode();
}