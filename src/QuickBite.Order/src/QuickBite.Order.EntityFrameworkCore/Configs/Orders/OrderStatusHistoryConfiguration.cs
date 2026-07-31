using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Domain.Orders.Entities;
using Volo.Abp.EntityFrameworkCore.Modeling;

public class OrderStatusHistoryConfiguration :
    IEntityTypeConfiguration<OrderStatusHistory>
{
    public void Configure(
        EntityTypeBuilder<OrderStatusHistory> builder)
    {
        builder.ToTable("OrderStatusHistories");

        builder.ConfigureByConvention();

        builder.Property(x => x.Reason)
            .HasMaxLength(255);

        builder.HasIndex(x => x.OrderId);
    }
}