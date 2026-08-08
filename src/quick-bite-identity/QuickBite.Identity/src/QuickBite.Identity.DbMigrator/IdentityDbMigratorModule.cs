using QuickBite.Identity.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace QuickBite.Identity.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(IdentityEntityFrameworkCoreModule),
    typeof(IdentityApplicationContractsModule)
    )]
public class IdentityDbMigratorModule : AbpModule
{
}
