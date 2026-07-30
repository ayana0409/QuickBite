using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuickBite.Order.Outbox;
using Volo.Abp.EntityFrameworkCore.Modeling;

public class OutboxMessageConfiguration :
    IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(
        EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("OutboxMessages");

        builder.ConfigureByConvention();

        builder.Property(x => x.EventType)
            .HasMaxLength(128);

        builder.Property(x => x.Topic)
            .HasMaxLength(64);

        builder.Property(x => x.PartitionKey)
            .HasMaxLength(64);

        builder.HasIndex(x => x.Status);
    }
}