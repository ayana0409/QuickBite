using Volo.Abp.Modularity;
using QuickBite.Order.Domain;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using QuickBite.Order.Domain.Orders.Repositories;
using Volo.Abp.EventBus.Distributed;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Orders.Managers;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(OrderTestBaseModule)
)]
public class OrderDomainTestModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddSingleton(Substitute.For<IOrderRepository>());
        context.Services.AddSingleton(Substitute.For<IDistributedEventBus>());
        context.Services.AddSingleton(Substitute.For<ILogger<OrderFulfillmentManager>>());
    }
}
