using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace QuickBite.Order.Data;

/* This is used if database provider does't define
 * IOrderDbSchemaMigrator implementation.
 */
public class NullOrderDbSchemaMigrator : IOrderDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
