using Microsoft.Extensions.DependencyInjection;
using QuickBite.Order.Domain;
using QuickBite.Order.Handlers;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.EventBus.Distributed;
using Volo.Abp.FeatureManagement;
using Volo.Abp.Mapperly;
using Volo.Abp.Modularity;
using Volo.Abp.SettingManagement;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(AbpMapperlyModule),
    typeof(OrderApplicationContractsModule),
    typeof(AbpFeatureManagementApplicationModule),
    typeof(AbpSettingManagementApplicationModule)
    )]
public class OrderApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddMapperlyObjectMapper<OrderApplicationModule>();

        // Register event handler so ABP subscribes to "food.item.synced" from Kafka
        Configure<AbpDistributedEventBusOptions>(options =>
        {
            options.Handlers.Add<FoodItemUpdatedEventHandler>();
        });

        Configure<AbpPermissionOptions>(options =>
        {
            options.ValueProviders.Add<QuickBite.Order.Permissions.ClaimPermissionValueProvider>();
        });
    }
}
