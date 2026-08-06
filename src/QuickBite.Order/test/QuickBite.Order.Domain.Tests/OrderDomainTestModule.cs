using Volo.Abp.Modularity;
using QuickBite.Order.Domain;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(OrderTestBaseModule)
)]
public class OrderDomainTestModule : AbpModule
{

}
