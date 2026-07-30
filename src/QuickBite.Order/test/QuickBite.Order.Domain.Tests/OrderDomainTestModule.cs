using Volo.Abp.Modularity;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(OrderTestBaseModule)
)]
public class OrderDomainTestModule : AbpModule
{

}
