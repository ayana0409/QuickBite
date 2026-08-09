using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using QuickBite.Order.Domain;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.DistributedEvents;
using Volo.Abp.EntityFrameworkCore.MySQL;
using Volo.Abp.EventBus.Distributed;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Modularity;
using Volo.Abp.SettingManagement.EntityFrameworkCore;

namespace QuickBite.Order.EntityFrameworkCore;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(AbpSettingManagementEntityFrameworkCoreModule),
    typeof(AbpEntityFrameworkCoreMySQLModule),
    typeof(AbpBackgroundJobsEntityFrameworkCoreModule),
    typeof(AbpAuditLoggingEntityFrameworkCoreModule),
    typeof(AbpFeatureManagementEntityFrameworkCoreModule)
    )]
public class OrderEntityFrameworkCoreModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        OrderEfCoreEntityExtensionMappings.Configure();
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddAbpDbContext<OrderDbContext>(options =>
        {
                /* Remove "includeAllEntities: true" to create
                 * default repositories only for aggregate roots */
            options.AddDefaultRepositories(includeAllEntities: true);
        });

        Configure<AbpDbContextOptions>(options =>
        {
            /* The main point to change your DBMS.
             * See also OrderMigrationsDbContextFactory for EF Core tooling. */
            options.UseMySQL();
        });

        // Enable native ABP Framework Outbox & Inbox patterns.
        // ABP automatically persists events into OutgoingEventRecord and IncomingEventRecord tables within the same DbTransaction.
        // ABP background worker automatically publishes to Kafka and verifies Idempotency when consuming events.
        Configure<AbpDistributedEventBusOptions>(options =>
        {
            options.Outboxes.Configure(
                config => { 
                    config.UseDbContext<OrderDbContext>(); 
                    config.ImplementationType = typeof(MyDbContextEventOutbox<OrderDbContext>);
                }
            );
            options.Inboxes.Configure(
                config => { config.UseDbContext<OrderDbContext>(); }
            );
        });

        context.Services.Replace(Microsoft.Extensions.DependencyInjection.ServiceDescriptor.Transient<DbContextEventOutbox<OrderDbContext>, MyDbContextEventOutbox<OrderDbContext>>());
        context.Services.Replace(Microsoft.Extensions.DependencyInjection.ServiceDescriptor.Transient<IEventOutbox, MyDbContextEventOutbox<OrderDbContext>>());
        context.Services.AddTransient<MyDbContextEventOutbox<OrderDbContext>>();
    }
}
