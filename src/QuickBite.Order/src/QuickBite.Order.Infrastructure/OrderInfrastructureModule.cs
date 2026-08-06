using System;
using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuickBite.Order.Domain;
using QuickBite.Order.Infrastructure.MassTransit.Consumers;
using QuickBite.Order.Infrastructure.MassTransit.StateMachine;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.BackgroundWorkers;
using Volo.Abp.Modularity;

namespace QuickBite.Order.Infrastructure;

[DependsOn(
    typeof(OrderDomainModule),
    typeof(AbpBackgroundWorkersModule)
)]
public class OrderInfrastructureModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        context.Services.AddMassTransit(x =>
        {
            x.AddSagaStateMachine<OrderStateMachine, OrderSagaStateInstance>()
             .InMemoryRepository();

            x.UsingInMemory((ctx, cfg) =>
            {
                cfg.ConfigureEndpoints(ctx);
            });

            x.AddRider(rider =>
            {
                rider.AddConsumer<CatalogEventConsumer>();
                rider.AddConsumer<FulfillmentEventConsumer>();

                rider.UsingKafka((ctx, k) =>
                {
                    var bootstrapServers = configuration["Kafka:Connections:Default"]
                                           ?? configuration["Kafka:Connections:Default:BootstrapServers"]
                                           ?? configuration["Kafka:BootstrapServers"]
                                           ?? "localhost:9092";

                    k.Host(bootstrapServers, h =>
                    {
                        var producerSection = configuration.GetSection("Kafka:Producer");
                        var consumerSection = configuration.GetSection("Kafka:Consumer");

                        var saslUsername = consumerSection["SaslUsername"] ?? producerSection["SaslUsername"];
                        var saslPassword = consumerSection["SaslPassword"] ?? producerSection["SaslPassword"];
                        var saslMechanism = consumerSection["SaslMechanism"] ?? producerSection["SaslMechanism"];
                        var securityProtocol = consumerSection["SecurityProtocol"] ?? producerSection["SecurityProtocol"];

                        if (!string.IsNullOrEmpty(saslUsername))
                        {
                            h.UseSasl(s =>
                            {
                                s.Username = saslUsername;
                                s.Password = saslPassword;
                                if (Enum.TryParse<Confluent.Kafka.SaslMechanism>(saslMechanism, out var sm)) s.Mechanism = sm;
                                if (Enum.TryParse<Confluent.Kafka.SecurityProtocol>(securityProtocol, out var sp)) s.SecurityProtocol = sp;
                            });
                        }

                        var enableSsl = consumerSection["EnableSslCertificateVerification"] ?? producerSection["EnableSslCertificateVerification"];
                        if (bool.TryParse(enableSsl, out var enableSslValue) && !enableSslValue)
                        {
                            h.UseSsl(s =>
                            {
                                s.EnableCertificateVerification = false;
                            });
                        }
                    });

                    k.TopicEndpoint<FoodItemUpdatedEto>("catalog-events", "order-service-catalog-consumer", e =>
                    {
                        e.UseRawJsonSerializer();
                        e.ConfigureConsumer<CatalogEventConsumer>(ctx);
                    });

                    k.TopicEndpoint<StockRejectedEto>("fulfillment-events", "order-service-fulfillment-stock-rejected-consumer", e =>
                    {
                        e.UseRawJsonSerializer();
                        e.ConfigureConsumer<FulfillmentEventConsumer>(ctx);
                    });

                    k.TopicEndpoint<StockReservedEto>("fulfillment-events", "order-service-fulfillment-stock-reserved-consumer", e =>
                    {
                        e.UseRawJsonSerializer();
                        e.ConfigureConsumer<FulfillmentEventConsumer>(ctx);
                    });
                });
            });
        });
    }
}
