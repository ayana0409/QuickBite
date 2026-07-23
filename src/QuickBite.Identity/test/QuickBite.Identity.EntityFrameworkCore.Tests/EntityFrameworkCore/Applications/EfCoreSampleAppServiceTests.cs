using QuickBite.Identity.Samples;
using Xunit;

namespace QuickBite.Identity.EntityFrameworkCore.Applications;

[Collection(IdentityTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<IdentityEntityFrameworkCoreTestModule>
{

}
