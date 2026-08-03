using Microsoft.Extensions.DependencyInjection;
using QuickBite.Order.Domain;
using QuickBite.Order.Handlers;
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

        // Đăng ký event handler để ABP biết subscribe "food.item.synced" từ Kafka
        Configure<AbpDistributedEventBusOptions>(options =>
        {
            options.Handlers.Add<FoodItemUpdatedEventHandler>();
        });
    }
}
