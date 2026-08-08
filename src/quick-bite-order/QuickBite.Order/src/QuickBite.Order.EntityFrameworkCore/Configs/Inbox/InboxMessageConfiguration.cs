using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Domain.Inbox;
using Volo.Abp.EntityFrameworkCore.Modeling;

public class InboxMessageConfiguration :
    IEntityTypeConfiguration<InboxMessage>
{
    public void Configure(
        EntityTypeBuilder<InboxMessage> builder)
    {
        builder.ToTable("InboxMessages");

        builder.ConfigureByConvention();

        builder.Property(x => x.EventType)
            .HasMaxLength(128);

        builder.Property(x => x.Consumer)
            .HasMaxLength(64);
    }
}