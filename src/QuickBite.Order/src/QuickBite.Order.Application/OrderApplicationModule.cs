using Volo.Abp.FeatureManagement;
using Volo.Abp.Modularity;
using Volo.Abp.SettingManagement;
using Microsoft.Extensions.DependencyInjection;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(OrderApplicationContractsModule),
    typeof(AbpFeatureManagementApplicationModule),
    typeof(AbpSettingManagementApplicationModule)
    )]
public class OrderApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddMapperlyObjectMapper<OrderApplicationModule>();
    }
}
