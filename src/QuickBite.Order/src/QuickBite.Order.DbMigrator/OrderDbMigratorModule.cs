using QuickBite.Order.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace QuickBite.Order.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(OrderEntityFrameworkCoreModule),
    typeof(OrderApplicationContractsModule)
    )]
public class OrderDbMigratorModule : AbpModule
{
}
