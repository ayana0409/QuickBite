using Confluent.Kafka;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using QuickBite.Order.Domain;
using QuickBite.Order.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Volo.Abp;
using Volo.Abp.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.Libs;
using Volo.Abp.AspNetCore.Serilog;
using Volo.Abp.Autofac;
using Volo.Abp.EventBus.Kafka;
using Volo.Abp.Kafka;
using Volo.Abp.Modularity;
using Volo.Abp.Security.Claims;
using Volo.Abp.Swashbuckle;
using Volo.Abp.UI.Navigation.Urls;
using Volo.Abp.VirtualFileSystem;
using QuickBite.Order.Middleware;

using QuickBite.Order.Infrastructure;
using QuickBite.Order.Infrastructure.Kafka;

using Volo.Abp.BackgroundJobs;

namespace QuickBite.Order;

[DependsOn(
    typeof(OrderHttpApiModule),
    typeof(AbpAutofacModule),
    typeof(OrderApplicationModule),
    typeof(OrderEntityFrameworkCoreModule),
    typeof(OrderInfrastructureModule),
    typeof(AbpAspNetCoreSerilogModule),
    typeof(AbpSwashbuckleModule),
    typeof(AbpEventBusKafkaModule)
)]
public class OrderHttpApiHostModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        //PreConfigure<OpenIddictBuilder>(builder =>
        //{
        //    builder.AddValidation(options =>
        //    {
        //        options.AddAudiences("Order");
        //        options.UseLocalServer();
        //        options.UseAspNetCore();
        //    });
        //});
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();
        var hostingEnvironment = context.Services.GetHostingEnvironment();

        ConfigureKafka(configuration);
        ConfigureAuthentication(context);
        ConfigureBundles();
        ConfigureUrls(configuration);
        ConfigureConventionalControllers();
        ConfigureVirtualFileSystem(context);
        ConfigureCors(context, configuration);
        ConfigureSwaggerServices(context, configuration);

        Configure<AbpBackgroundJobOptions>(options =>
        {
            options.IsJobExecutionEnabled = true;
        });
    }


    private void ConfigureKafka(IConfiguration configuration)
    {
        var bootstrapServers = configuration["Kafka:Connections:Default"] ?? configuration["Kafka:Producer:BootstrapServers"];
        var producerSection = configuration.GetSection("Kafka:Producer");

        Configure<AbpKafkaOptions>(options =>
        {
            if (!string.IsNullOrEmpty(bootstrapServers))
            {
                var clientConfig = new Confluent.Kafka.ClientConfig { BootstrapServers = bootstrapServers };
                if (Enum.TryParse<Confluent.Kafka.SecurityProtocol>(producerSection["SecurityProtocol"], out var sp)) clientConfig.SecurityProtocol = sp;
                if (Enum.TryParse<Confluent.Kafka.SaslMechanism>(producerSection["SaslMechanism"], out var sm)) clientConfig.SaslMechanism = sm;
                clientConfig.SaslUsername = producerSection["SaslUsername"];
                clientConfig.SaslPassword = producerSection["SaslPassword"];
                if (bool.TryParse(producerSection["EnableSslCertificateVerification"], out var verify)) clientConfig.EnableSslCertificateVerification = verify;

                options.Connections["Default"] = clientConfig;
                options.Connections["KafkaEventBus"] = clientConfig;
            }

            options.ConfigureConsumer = config =>
            {
                configuration.GetSection("Kafka:Consumer").Bind(config);
                if (!string.IsNullOrEmpty(bootstrapServers)) config.BootstrapServers = bootstrapServers;
            };

            options.ConfigureProducer = config =>
            {
                configuration.GetSection("Kafka:Producer").Bind(config);
                if (!string.IsNullOrEmpty(bootstrapServers)) config.BootstrapServers = bootstrapServers;
            };

            options.ConfigureTopic = specification =>
            {
                specification.NumPartitions = 3;
                specification.ReplicationFactor = 3;
            };
        });

        Configure<Volo.Abp.EventBus.Kafka.AbpKafkaEventBusOptions>(options =>
        {
            options.TopicName = configuration["Kafka:EventBus:TopicName"] ?? "order-events";
            options.GroupId = configuration["Kafka:EventBus:GroupId"] ?? "order-service-group";
            options.ConnectionName = "KafkaEventBus";
        });

    }

    private void ConfigureAuthentication(ServiceConfigurationContext context)
    {
        context.Services.Configure<AbpClaimsPrincipalFactoryOptions>(options =>
        {
            options.IsDynamicClaimsEnabled = true;
        });
    }

    private void ConfigureBundles()
    {
        //Configure<AbpBundlingOptions>(options =>
        //{
        //    options.StyleBundles.Configure(
        //        LeptonXLiteThemeBundles.Styles.Global,
        //        bundle =>
        //        {
        //            bundle.AddFiles("/global-styles.css");
        //        }
        //    );
        //});
    }

    private void ConfigureUrls(IConfiguration configuration)
    {
        Configure<AppUrlOptions>(options =>
        {
            options.Applications["MVC"].RootUrl = configuration["App:SelfUrl"];
            options.RedirectAllowedUrls.AddRange(configuration["App:RedirectAllowedUrls"]?.Split(',') ?? Array.Empty<string>());

            options.Applications["Angular"].RootUrl = configuration["App:ClientUrl"];
        });


        Configure<AbpMvcLibsOptions>(options =>
        {
            options.CheckLibs = false;
        });

    }

    private void ConfigureVirtualFileSystem(ServiceConfigurationContext context)
    {
        var hostingEnvironment = context.Services.GetHostingEnvironment();

        if (hostingEnvironment.IsDevelopment())
        {
            Configure<AbpVirtualFileSystemOptions>(options =>
            {
                options.FileSets.ReplaceEmbeddedByPhysical<OrderDomainSharedModule>(
                    Path.Combine(hostingEnvironment.ContentRootPath,
                        $"..{Path.DirectorySeparatorChar}QuickBite.Order.Domain.Shared"));
                options.FileSets.ReplaceEmbeddedByPhysical<OrderDomainModule>(
                    Path.Combine(hostingEnvironment.ContentRootPath,
                        $"..{Path.DirectorySeparatorChar}QuickBite.Order.Domain"));
                options.FileSets.ReplaceEmbeddedByPhysical<OrderApplicationContractsModule>(
                    Path.Combine(hostingEnvironment.ContentRootPath,
                        $"..{Path.DirectorySeparatorChar}QuickBite.Order.Application.Contracts"));
                options.FileSets.ReplaceEmbeddedByPhysical<OrderApplicationModule>(
                    Path.Combine(hostingEnvironment.ContentRootPath,
                        $"..{Path.DirectorySeparatorChar}QuickBite.Order.Application"));
            });
        }
    }

    private void ConfigureConventionalControllers()
    {
        Configure<AbpAspNetCoreMvcOptions>(options =>
        {
            options.ConventionalControllers.Create(typeof(OrderApplicationModule).Assembly);
        });
    }

    private static void ConfigureSwaggerServices(ServiceConfigurationContext context, IConfiguration configuration)
    {
        context.Services.AddAbpSwaggerGenWithOAuth(
            configuration["AuthServer:Authority"]!,
            new Dictionary<string, string>
            {
                    {"Order", "Order API"}
            },
            options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo { Title = "Order API", Version = "v1" });
                options.DocInclusionPredicate((docName, description) => true);
                options.CustomSchemaIds(type => type.FullName);
            });
    }

    private void ConfigureCors(ServiceConfigurationContext context, IConfiguration configuration)
    {
        context.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                builder
                    .WithOrigins(configuration["App:CorsOrigins"]?
                        .Split(",", StringSplitOptions.RemoveEmptyEntries)
                        .Select(o => o.RemovePostFix("/"))
                        .ToArray() ?? Array.Empty<string>())
                    .WithAbpExposedHeaders()
                    .SetIsOriginAllowedToAllowWildcardSubdomains()
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });
    }

    public override void OnApplicationInitialization(ApplicationInitializationContext context)
    {
        var app = context.GetApplicationBuilder();
        var env = context.GetEnvironment();

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseAbpRequestLocalization();

        if (!env.IsDevelopment())
        {
            //app.UseErrorPage();
        }

        app.UseCorrelationId();
        app.UseMiddleware<ResponseWrapperMiddleware>();
        app.MapAbpStaticAssets();
        app.UseRouting();
        app.UseCors();
        app.UseAuthentication();
        app.UseUnitOfWork();
        app.UseDynamicClaims();
        app.UseAuthorization();

        app.UseSwagger();
        app.UseAbpSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Order API");

            var configuration = context.ServiceProvider.GetRequiredService<IConfiguration>();
            c.OAuthClientId(configuration["AuthServer:SwaggerClientId"]);
            c.OAuthScopes("Order");
        });

        app.UseAuditing();
        app.UseAbpSerilogEnrichers();
        app.UseConfiguredEndpoints();
    }
}
