using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Domain.Orders.Entities;
using Volo.Abp.EntityFrameworkCore.Modeling;

public class OrderItemConfiguration :
    IEntityTypeConfiguration<OrderItem>
{
    public void Configure(
        EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("OrderItems");

        builder.ConfigureByConvention();

        builder.Property(x => x.Sku)
            .IsRequired();

        builder.Property(x => x.ItemName)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(x => x.UnitPrice)
            .HasPrecision(14, 2);

        builder.HasIndex(x => x.OrderId);
    }
}