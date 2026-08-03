using Microsoft.Extensions.DependencyInjection;
using QuickBite.Order.Domain;
using Volo.Abp.BackgroundWorkers;
using Volo.Abp.Modularity;

namespace QuickBite.Order.Infrastructure;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(AbpBackgroundWorkersModule)
)]
public class OrderInfrastructureModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
    }
}
