using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace QuickBite.Order.Infrastructure.MassTransit.StateMachine;

public class OrderSagaStateInstanceMap : SagaClassMap<OrderSagaStateInstance>
{
    protected override void Configure(EntityTypeBuilder<OrderSagaStateInstance> entity, ModelBuilder model)
    {
        entity.ToTable("OrderSagaStates");

        entity.Property(x => x.CurrentState).HasMaxLength(64);
        entity.Property(x => x.TotalAmount).HasPrecision(18, 2);
        entity.Property(x => x.ItemsJson).HasColumnType("longtext");

        entity.Property(x => x.Version).IsRowVersion();
    }
}
