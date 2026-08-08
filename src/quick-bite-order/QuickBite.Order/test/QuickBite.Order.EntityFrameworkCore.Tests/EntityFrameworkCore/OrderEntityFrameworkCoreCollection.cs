using Xunit;

namespace QuickBite.Order.EntityFrameworkCore;

[CollectionDefinition(OrderTestConsts.CollectionDefinitionName)]
public class OrderEntityFrameworkCoreCollection : ICollectionFixture<OrderEntityFrameworkCoreFixture>
{

}
