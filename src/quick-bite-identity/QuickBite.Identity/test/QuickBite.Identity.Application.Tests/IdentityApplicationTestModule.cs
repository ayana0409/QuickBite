using Volo.Abp.Modularity;

namespace QuickBite.Identity;

[DependsOn(
    typeof(IdentityApplicationModule),
    typeof(IdentityDomainTestModule)
)]
public class IdentityApplicationTestModule : AbpModule
{

}
