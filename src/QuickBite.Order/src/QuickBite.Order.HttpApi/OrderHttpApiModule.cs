using Localization.Resources.AbpUi;
using QuickBite.Order.Localization;
using Volo.Abp.FeatureManagement;
using Volo.Abp.Localization;
using Volo.Abp.Modularity;
using Volo.Abp.SettingManagement;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderApplicationContractsModule),
    typeof(AbpFeatureManagementHttpApiModule),
    typeof(AbpSettingManagementHttpApiModule)
    )]
public class OrderHttpApiModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        ConfigureLocalization();
    }

    private void ConfigureLocalization()
    {
        Configure<AbpLocalizationOptions>(options =>
        {
            options.Resources
                .Get<OrderResource>()
                .AddBaseTypes(
                    typeof(AbpUiResource)
                );
        });
    }
}
