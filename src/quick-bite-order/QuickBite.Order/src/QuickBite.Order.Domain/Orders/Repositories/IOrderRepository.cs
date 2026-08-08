using System;
using System.Threading.Tasks;
using Volo.Abp.Domain.Repositories;

using OrderEntity = QuickBite.Order.Domain.Orders.AggregateRoots.Order;
namespace QuickBite.Order.Domain.Orders.Repositories;

public interface IOrderRepository : IRepository<OrderEntity, Guid>
{
    Task<bool> IsOrderCodeExistsAsync(
        string orderCode);
}