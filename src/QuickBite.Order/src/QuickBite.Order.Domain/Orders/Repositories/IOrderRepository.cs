using System;
using System.Threading.Tasks;
using Volo.Abp.Domain.Repositories;

using AggregateRoots = QuickBite.Order.Domain.Order.AggregateRoots.Order;
namespace QuickBite.Order.Domain.Orders.Repositories;

public interface IOrderRepository : IRepository<AggregateRoots, Guid>
{
    Task<bool> IsOrderCodeExistsAsync(
        string orderCode);
}