using QuickBite.Order.Samples;
using Xunit;

namespace QuickBite.Order.EntityFrameworkCore.Applications;

[Collection(OrderTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<OrderEntityFrameworkCoreTestModule>
{

}
