using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.FeatureManagement;
using Volo.Abp.Modularity;
using Volo.Abp.SettingManagement;
using Volo.Abp.VirtualFileSystem;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderApplicationContractsModule),
    typeof(AbpFeatureManagementHttpApiClientModule),
    typeof(AbpSettingManagementHttpApiClientModule)
)]
public class OrderHttpApiClientModule : AbpModule
{
    public const string RemoteServiceName = "Default";

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddHttpClientProxies(
            typeof(OrderApplicationContractsModule).Assembly,
            RemoteServiceName
        );

        Configure<AbpVirtualFileSystemOptions>(options =>
        {
            options.FileSets.AddEmbedded<OrderHttpApiClientModule>();
        });
    }
}
