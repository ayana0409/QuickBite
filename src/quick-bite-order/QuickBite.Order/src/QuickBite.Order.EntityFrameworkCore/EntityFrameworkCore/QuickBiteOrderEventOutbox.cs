using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.DistributedEvents;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.EntityFrameworkCore;

/// <summary>
/// Overrides DeleteAsync and DeleteManyAsync to prevent MySQL "@ids" parameterization error on EF Core bulk delete.
/// </summary>
[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(DbContextEventOutbox<>))]
public class MyDbContextEventOutbox<TDbContext> : DbContextEventOutbox<TDbContext> 
    where TDbContext : IEfCoreDbContext, IHasEventOutbox
{
    public MyDbContextEventOutbox(IDbContextProvider<TDbContext> dbContextProvider)
        : base(dbContextProvider)
    {
    }

    public override async Task DeleteAsync(Guid id)
    {
        var dbContext = await DbContextProvider.GetDbContextAsync();
        var record = await dbContext.Set<OutgoingEventRecord>().FindAsync(id);
        if (record != null)
        {
            dbContext.Set<OutgoingEventRecord>().Remove(record);
            await dbContext.SaveChangesAsync();
        }
    }

    public override async Task DeleteManyAsync(IEnumerable<Guid> ids)
    {
        var idList = ids.ToList();
        if (!idList.Any())
        {
            return;
        }

        var dbContext = await DbContextProvider.GetDbContextAsync();
        foreach (var id in idList)
        {
            var record = await dbContext.Set<OutgoingEventRecord>().FindAsync(id);
            if (record != null)
            {
                dbContext.Set<OutgoingEventRecord>().Remove(record);
            }
        }
        await dbContext.SaveChangesAsync();
    }
}
