using Volo.Abp.Modularity;

namespace QuickBite.Identity;

public abstract class IdentityApplicationTestBase<TStartupModule> : IdentityTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
