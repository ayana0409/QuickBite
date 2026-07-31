using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Domain.Orders.Saga;
using Volo.Abp.EntityFrameworkCore.Modeling;

public class OrderSagaStateConfiguration :
    IEntityTypeConfiguration<OrderSagaState>
{
    public void Configure(
        EntityTypeBuilder<OrderSagaState> builder)
    {
        builder.ToTable("OrderSagaStates");

        builder.ConfigureByConvention();

        builder.HasIndex(x => x.CorrelationId)
            .IsUnique();

        builder.HasIndex(x =>
            x.RestaurantAcceptDeadline);
    }
}