using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Domain.Orders.Entities;
using Volo.Abp.EntityFrameworkCore.Modeling;

namespace QuickBite.Order.EntityFrameworkCore.Configs.Orders;

public class FoodItemConfiguration : IEntityTypeConfiguration<FoodItem>
{
    public void Configure(EntityTypeBuilder<FoodItem> builder)
    {
        builder.ToTable("Order_FoodItems");

        builder.ConfigureByConvention();

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.Price)
            .HasPrecision(14, 2);
    }
}
