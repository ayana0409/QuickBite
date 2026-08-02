using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Domain.Orders.AggregateRoots;
using Volo.Abp.EntityFrameworkCore.Modeling;

public class OrderConfiguration :
    IEntityTypeConfiguration<Order>
{
    public void Configure(
        EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.ConfigureByConvention();

        builder.Navigation(x => x.OrderItems).AutoInclude();

        builder.Property(x => x.OrderCode)
            .IsRequired()
            .HasMaxLength(24);

        builder.HasIndex(x => x.OrderCode)
            .IsUnique();

        builder.Property(x => x.Currency)
            .HasMaxLength(8);

        builder.Property(x => x.TotalAmount)
            .HasPrecision(14, 2);

        builder.HasIndex(x => x.CustomerId);

        builder.HasIndex(x => x.RestaurantId);

        builder.OwnsOne(
            x => x.DeliveryAddress,
            address =>
            {
                address.Property(x => x.FullName);

                address.Property(x => x.PhoneNumber);

                address.Property(x => x.AddressLine);

                address.Property(x => x.Ward);

                address.Property(x => x.District);

                address.Property(x => x.Province);

                address.Property(x => x.Note);
            });
    }
}