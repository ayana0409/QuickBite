using Xunit;

namespace QuickBite.Identity.EntityFrameworkCore;

[CollectionDefinition(IdentityTestConsts.CollectionDefinitionName)]
public class IdentityEntityFrameworkCoreCollection : ICollectionFixture<IdentityEntityFrameworkCoreFixture>
{

}
