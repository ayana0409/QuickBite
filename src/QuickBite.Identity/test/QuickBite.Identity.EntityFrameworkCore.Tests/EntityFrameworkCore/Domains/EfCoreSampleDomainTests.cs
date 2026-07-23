using QuickBite.Identity.Samples;
using Xunit;

namespace QuickBite.Identity.EntityFrameworkCore.Domains;

[Collection(IdentityTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<IdentityEntityFrameworkCoreTestModule>
{

}
