using Microsoft.EntityFrameworkCore;
using QuickBite.Order.Domain.Inbox;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.Saga;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.DistributedEvents;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;

namespace QuickBite.Order.EntityFrameworkCore;

[ConnectionStringName("Default")]
public class OrderDbContext :
    AbpDbContext<OrderDbContext>,
    IHasEventInbox,
    IHasEventOutbox
{
    /* Add DbSet properties for your Aggregate Roots / Entities here. */

    #region Entities from the modules

    /* Notice: We only implemented IIdentityDbContext and ITenantManagementDbContext
     * and replaced them for this DbContext. This allows you to perform JOIN
     * queries for the entities of these modules over the repositories easily. You
     * typically don't need that for other modules. But, if you need, you can
     * implement the DbContext interface of the needed module and use ReplaceDbContext
     * attribute just like IIdentityDbContext and ITenantManagementDbContext.
     *
     * More info: Replacing a DbContext of a module ensures that the related module
     * uses this DbContext on runtime. Otherwise, it will use its own DbContext class.
     */
    public DbSet<Domain.Orders.AggregateRoots.Order> Orders { get; set; }

    public DbSet<OrderItem> OrderItems { get; set; }

    public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }

    public DbSet<OrderSagaState> OrderSagaStates { get; set; }


    public DbSet<InboxMessage> InboxMessages { get; set; }

    /// <summary>Local FoodItem replica synchronized from Catalog service via Kafka.</summary>
    public DbSet<FoodItem> FoodItems { get; set; }

    /// <summary>ABP Distributed Event Bus Inbox</summary>
    public DbSet<IncomingEventRecord> IncomingEvents { get; set; }

    /// <summary>ABP Distributed Event Bus Outbox</summary>
    public DbSet<OutgoingEventRecord> OutgoingEvents { get; set; }
    #endregion

    public OrderDbContext(DbContextOptions<OrderDbContext> options)
        : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureFeatureManagement();
        builder.ConfigureEventInbox();
        builder.ConfigureEventOutbox();

        builder.ApplyConfigurationsFromAssembly(typeof(OrderDbContext).Assembly);
        /* Configure your own tables/entities inside here */

        //builder.Entity<YourEntity>(b =>
        //{
        //    b.ToTable(OrderConsts.DbTablePrefix + "YourEntities", OrderConsts.DbSchema);
        //    b.ConfigureByConvention(); //auto configure for the base class props
        //    //...
        //});
    }
}
