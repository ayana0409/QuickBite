using QuickBite.Order.Samples;
using Xunit;

namespace QuickBite.Order.EntityFrameworkCore.Domains;

[Collection(OrderTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<OrderEntityFrameworkCoreTestModule>
{

}
