using Volo.Abp.Modularity;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Volo.Abp.Domain.Repositories;
using QuickBite.Order.Domain.Orders.Entities;
using Volo.Abp.Auditing;
using System;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderApplicationModule),
    typeof(OrderDomainTestModule)
)]
public class OrderApplicationTestModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        Configure<AbpAuditingOptions>(options =>
        {
            options.IsEnabled = false;
        });

        context.Services.AddSingleton(Substitute.For<IAuditingStore>());
        context.Services.AddSingleton(Substitute.For<IRepository<FoodItem, Guid>>());
    }
}
