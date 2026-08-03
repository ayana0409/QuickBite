using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QuickBite.Order.Domain.Outbox;
using QuickBite.Order.Infrastructure.Kafka.Producers;
using Volo.Abp.BackgroundWorkers;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Threading;

namespace QuickBite.Order.Infrastructure.BackgroundWorkers;

public class OutboxPublisherWorker : AsyncPeriodicBackgroundWorkerBase
{
    public OutboxPublisherWorker(
        AbpAsyncTimer timer,
        IServiceScopeFactory serviceScopeFactory)
        : base(timer, serviceScopeFactory)
    {
        // Periodic execution: every 5000 milliseconds (5 seconds)
        Timer.Period = 5000;
    }

    protected override async Task DoWorkAsync(PeriodicBackgroundWorkerContext workerContext)
    {
        var outboxRepository = workerContext.ServiceProvider.GetRequiredService<IRepository<OutboxMessage, Guid>>();
        var kafkaProducer = workerContext.ServiceProvider.GetRequiredService<IKafkaProducer>();

        var pendingMessages = await outboxRepository.GetListAsync(
            x => x.Status == "Pending" && x.RetryCount < 5);

        if (!pendingMessages.Any())
        {
            return;
        }

        Logger.LogInformation("[OutboxPublisherWorker] Found {Count} pending outbox messages to publish.", pendingMessages.Count);

        foreach (var message in pendingMessages)
        {
            try
            {
                await kafkaProducer.PublishAsync(
                    message.Topic,
                    message.PartitionKey ?? message.EventId.ToString(),
                    message.Payload);

                message.MarkAsProcessed();
                await outboxRepository.UpdateAsync(message);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "[OutboxPublisherWorker] Error publishing outbox message Id: {MessageId}", message.Id);
                message.MarkAsFailed(ex.Message);
                await outboxRepository.UpdateAsync(message);
            }
        }
    }
}
