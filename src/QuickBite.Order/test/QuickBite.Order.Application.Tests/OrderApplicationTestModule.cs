using Volo.Abp.Modularity;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderApplicationModule),
    typeof(OrderDomainTestModule)
)]
public class OrderApplicationTestModule : AbpModule
{

}
