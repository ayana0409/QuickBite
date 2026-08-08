using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Inbox;
using Volo.Abp.BackgroundWorkers;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Threading;

namespace QuickBite.Order.Infrastructure.BackgroundWorkers;

public class InboxCleanupWorker : AsyncPeriodicBackgroundWorkerBase
{
    public InboxCleanupWorker(
        AbpAsyncTimer timer,
        IServiceScopeFactory serviceScopeFactory)
        : base(timer, serviceScopeFactory)
    {
        // Periodic execution: every 24 hours (86400000 ms)
        Timer.Period = 86400000;
    }

    protected override async Task DoWorkAsync(PeriodicBackgroundWorkerContext workerContext)
    {
        var inboxRepository = workerContext.ServiceProvider.GetRequiredService<IRepository<InboxMessage, Guid>>();
        var cutoffDate = DateTime.UtcNow.AddDays(-7);

        var oldMessages = await inboxRepository.GetListAsync(x => x.ProcessedAt < cutoffDate);
        if (!oldMessages.Any())
        {
            return;
        }

        Logger.LogInformation("[InboxCleanupWorker] Cleaning up {Count} processed inbox messages older than 7 days.", oldMessages.Count);
        await inboxRepository.DeleteManyAsync(oldMessages);
    }
}
