using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QuickBite.Identity.Data;
using QuickBite.Identity.EntityFrameworkCore;

namespace QuickBite.Identity.Web.Extensions;

/// <summary>
/// Extension methods for automatic database migration and seeding.
/// </summary>
public static class DatabaseMigrationExtensions
{
    /// <summary>
    /// Checks database schema and automatically applies pending migrations and data seeding
    /// when the tables are missing in the database or new migrations exist.
    /// </summary>
    public static async Task AutoMigrateDatabaseAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        var configuration = app.Services.GetRequiredService<IConfiguration>();
        var logger = app.Services.GetRequiredService<ILogger<WebApplication>>();

        // Read AutoMigrate flag from configuration (default is true)
        var autoMigrate = configuration.GetValue<bool>("Database:AutoMigrate", true);
        if (!autoMigrate)
        {
            logger.LogInformation("[AutoMigration] Database auto-migration is disabled by configuration (Database:AutoMigrate = false).");
            return;
        }

        var maxRetries = configuration.GetValue<int>("Database:MaxRetryCount", 5);
        var retryDelaySeconds = configuration.GetValue<int>("Database:RetryDelaySeconds", 3);

        logger.LogInformation("[AutoMigration] Checking database status and tables...");

        using var scope = app.Services.CreateScope();
        var serviceProvider = scope.ServiceProvider;
        var dbContext = serviceProvider.GetRequiredService<IdentityDbContext>();

        var (databaseExists, hasTables) = await CheckDatabaseAndTablesWithRetryAsync(
            dbContext,
            maxRetries,
            TimeSpan.FromSeconds(retryDelaySeconds),
            logger,
            cancellationToken);

        // When the database does not have tables, automatically run migrations and seed data
        if (!hasTables)
        {
            logger.LogWarning("[AutoMigration] Database tables do not exist (Database exists: {DatabaseExists}). Starting automatic database migration and seeding...", databaseExists);

            var migrationService = serviceProvider.GetRequiredService<IdentityDbMigrationService>();
            await migrationService.MigrateAsync();

            logger.LogInformation("[AutoMigration] Database migration and data seeding completed successfully.");
        }
        else
        {
            // If tables exist, check if there are any unapplied/pending migrations
            var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
            if (pendingMigrations.Any())
            {
                logger.LogInformation("[AutoMigration] Database tables exist, but found {Count} pending migration(s): {Migrations}. Applying pending migrations...",
                    pendingMigrations.Count,
                    string.Join(", ", pendingMigrations));

                var migrationService = serviceProvider.GetRequiredService<IdentityDbMigrationService>();
                await migrationService.MigrateAsync();

                logger.LogInformation("[AutoMigration] Pending migrations applied successfully.");
            }
            else
            {
                logger.LogInformation("[AutoMigration] Database tables already exist and schema is up to date. Skipping migration.");
            }
        }
    }

    /// <summary>
    /// Checks database existence and table existence with retry logic for resilience against startup delays.
    /// </summary>
    private static async Task<(bool DatabaseExists, bool HasTables)> CheckDatabaseAndTablesWithRetryAsync(
        IdentityDbContext dbContext,
        int maxRetries,
        TimeSpan delay,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                var dbCreator = dbContext.Database.GetService<IRelationalDatabaseCreator>();
                var databaseExists = await dbCreator.ExistsAsync(cancellationToken);
                var hasTables = databaseExists && await dbCreator.HasTablesAsync(cancellationToken);

                return (databaseExists, hasTables);
            }
            catch (Exception ex) when (attempt < maxRetries && !cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(
                    ex,
                    "[AutoMigration] Failed to connect to database on attempt {Attempt}/{MaxRetries}. Retrying in {Seconds}s...",
                    attempt,
                    maxRetries,
                    delay.TotalSeconds);

                await Task.Delay(delay, cancellationToken);
            }
        }

        // Final attempt will throw if database is completely unreachable
        var finalCreator = dbContext.Database.GetService<IRelationalDatabaseCreator>();
        var finalDbExists = await finalCreator.ExistsAsync(cancellationToken);
        var finalHasTables = finalDbExists && await finalCreator.HasTablesAsync(cancellationToken);

        return (finalDbExists, finalHasTables);
    }
}
