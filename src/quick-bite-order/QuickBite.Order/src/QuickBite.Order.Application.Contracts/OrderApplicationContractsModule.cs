using Volo.Abp.FeatureManagement;
using Volo.Abp.Modularity;
using Volo.Abp.ObjectExtending;
using Volo.Abp.SettingManagement;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderDomainSharedModule),
    typeof(AbpFeatureManagementApplicationContractsModule),
    typeof(AbpSettingManagementApplicationContractsModule),
    typeof(AbpObjectExtendingModule)
)]
public class OrderApplicationContractsModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        OrderDtoExtensions.Configure();
    }
}
