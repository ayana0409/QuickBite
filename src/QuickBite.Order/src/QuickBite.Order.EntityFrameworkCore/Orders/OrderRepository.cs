using Microsoft.EntityFrameworkCore;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;

using OrderEntity = QuickBite.Order.Domain.Orders.AggregateRoots.Order;
namespace QuickBite.Order.Orders;

public class OrderRepository :
    EfCoreRepository<OrderDbContext, OrderEntity, Guid>,
    IOrderRepository
{
    public OrderRepository(
        IDbContextProvider<OrderDbContext> dbContextProvider)
        : base(dbContextProvider)
    {
    }

    public async Task<bool> IsOrderCodeExistsAsync(
        string orderCode)
    {
        var dbSet = await GetDbSetAsync();

        return await dbSet.AnyAsync(
            x => x.OrderCode == orderCode);
    }
}