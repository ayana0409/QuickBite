using Volo.Abp.Modularity;

namespace QuickBite.Order;

public abstract class OrderApplicationTestBase<TStartupModule> : OrderTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
