using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuickBite.Order.Data;
using Volo.Abp.DependencyInjection;

namespace QuickBite.Order.EntityFrameworkCore;

public class EntityFrameworkCoreOrderDbSchemaMigrator
    : IOrderDbSchemaMigrator, ITransientDependency
{
    private readonly IServiceProvider _serviceProvider;

    public EntityFrameworkCoreOrderDbSchemaMigrator(
        IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task MigrateAsync()
    {
        /* We intentionally resolve the OrderDbContext
         * from IServiceProvider (instead of directly injecting it)
         * to properly get the connection string of the current tenant in the
         * current scope.
         */

        await _serviceProvider
            .GetRequiredService<OrderDbContext>()
            .Database
            .MigrateAsync();
    }
}
