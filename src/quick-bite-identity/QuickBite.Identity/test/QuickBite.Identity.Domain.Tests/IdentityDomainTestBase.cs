using Volo.Abp.Modularity;

namespace QuickBite.Identity;

/* Inherit from this class for your domain layer tests. */
public abstract class IdentityDomainTestBase<TStartupModule> : IdentityTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
