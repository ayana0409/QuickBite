using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;
using QuickBite.Identity.Claims;
using QuickBite.Identity.EntityFrameworkCore;
using QuickBite.Identity.Localization;
using QuickBite.Identity.MultiTenancy;
using QuickBite.Identity.Web.HealthCheck;
using QuickBite.Identity.Web.Menus;
using QuickBite.Identity.Web.Middleware;
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Account.Web;
using Volo.Abp.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.Libs;
using Volo.Abp.AspNetCore.Mvc.Localization;
using Volo.Abp.AspNetCore.Mvc.UI.Bundling;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.LeptonXLite;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.LeptonXLite.Bundling;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.Shared;
using Volo.Abp.AspNetCore.Serilog;
using Volo.Abp.Autofac;
using Volo.Abp.Identity.Web;
using Volo.Abp.Modularity;
using Volo.Abp.OpenIddict;
using Volo.Abp.Security.Claims;
using Volo.Abp.SettingManagement.Web;
using Volo.Abp.Swashbuckle;
using Volo.Abp.Timing;
using Volo.Abp.UI.Navigation;
using Volo.Abp.UI.Navigation.Urls;
using Volo.Abp.VirtualFileSystem;

namespace QuickBite.Identity.Web;



[DependsOn(
    typeof(IdentityHttpApiModule),
    typeof(IdentityApplicationModule),
    typeof(IdentityEntityFrameworkCoreModule),
    typeof(AbpAutofacModule),
    typeof(AbpIdentityWebModule),
    typeof(AbpSettingManagementWebModule),
    typeof(AbpAccountWebOpenIddictModule),
    typeof(AbpAspNetCoreMvcUiLeptonXLiteThemeModule),
    typeof(AbpAspNetCoreSerilogModule),
    typeof(AbpSwashbuckleModule)
    )]
public class IdentityWebModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        var hostingEnvironment = context.Services.GetHostingEnvironment();
        var configuration = context.Services.GetConfiguration();

        context.Services.PreConfigure<AbpMvcDataAnnotationsLocalizationOptions>(options =>
        {
            options.AddAssemblyResource(
                typeof(IdentityResource),
                typeof(IdentityDomainModule).Assembly,
                typeof(IdentityDomainSharedModule).Assembly,
                typeof(IdentityApplicationModule).Assembly,
                typeof(IdentityApplicationContractsModule).Assembly,
                typeof(IdentityWebModule).Assembly
            );
        });

        PreConfigure<OpenIddictBuilder>(builder =>
        {
            builder.AddValidation(options =>
            {
                options.UseLocalServer();
                options.UseAspNetCore();
            });
        });

        PreConfigure<OpenIddictServerBuilder>(serverBuilder =>
        {
            serverBuilder.UseAspNetCore()
                .EnableAuthorizationEndpointPassthrough()
                .DisableTransportSecurityRequirement();
                        
            serverBuilder.SetTokenEndpointUris("/connect/token");
            serverBuilder.SetRevocationEndpointUris("/connect/revocation");
            serverBuilder.SetAuthorizationEndpointUris("/connect/authorize");
            serverBuilder.SetUserInfoEndpointUris("/connect/userinfo");
            serverBuilder.SetIntrospectionEndpointUris("/connect/introspect");
            serverBuilder.SetEndSessionEndpointUris("/connect/logout");

            serverBuilder.AllowAuthorizationCodeFlow()
                .AllowRefreshTokenFlow()
                .AllowPasswordFlow()
                .AllowClientCredentialsFlow();

            serverBuilder.RegisterScopes(
                OpenIddictConstants.Scopes.OpenId,
                OpenIddictConstants.Scopes.Profile,
                OpenIddictConstants.Scopes.Email,
                OpenIddictConstants.Scopes.Phone,
                OpenIddictConstants.Scopes.Roles,
                "Identity",
                "quickbite.api",
                "permissions"
            );

            if (!hostingEnvironment.IsDevelopment())
            {
                var certBase64 = configuration["OpenIddict:CertificateBase64"] 
                    ?? configuration["OPENIDDICT_CERTIFICATE_BASE64"];
                var certPass = configuration["OpenIddict:CertificatePassword"] 
                    ?? configuration["OPENIDDICT_CERTIFICATE_PASSWORD"] 
                    ?? string.Empty;
                var loaded = false;

                // 1. Prioritize loading from Environment Variable (Base64 encoded PFX)
                if (!string.IsNullOrWhiteSpace(certBase64))
                {
                    try
                    {
                        var certBytes = Convert.FromBase64String(certBase64.Trim());
                        if (certBytes.Length > 0)
                        {
                            var cert = X509CertificateLoader.LoadPkcs12(certBytes, certPass, X509KeyStorageFlags.Exportable | X509KeyStorageFlags.EphemeralKeySet);
                            serverBuilder.AddEncryptionCertificate(cert);
                            serverBuilder.AddSigningCertificate(cert);
                            loaded = true;
                            Console.WriteLine("✅ [OpenIddict] Successfully loaded persistent production certificate from OPENIDDICT_CERTIFICATE_BASE64 environment variable.");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"⚠️ [OpenIddict Certificate Warning] Could not load certificate from OPENIDDICT_CERTIFICATE_BASE64: {ex.Message}");
                    }
                }

                // 2. Fallback to loading from file if not loaded from Base64
                if (!loaded)
                {
                    var certFileName = "openiddict.pfx";
                    var certPath = System.IO.Path.Combine(hostingEnvironment.ContentRootPath, certFileName);
                    var renderSecretPath = System.IO.Path.Combine("/etc/secrets", certFileName);
                    var fileToLoad = System.IO.File.Exists(certPath) ? certPath : (System.IO.File.Exists(renderSecretPath) ? renderSecretPath : null);

                    if (fileToLoad != null)
                    {
                        try
                        {
                            var bytes = System.IO.File.ReadAllBytes(fileToLoad);
                            if (bytes.Length > 0)
                            {
                                var cert = X509CertificateLoader.LoadPkcs12(bytes, certPass, X509KeyStorageFlags.Exportable | X509KeyStorageFlags.EphemeralKeySet);
                                serverBuilder.AddEncryptionCertificate(cert);
                                serverBuilder.AddSigningCertificate(cert);
                                loaded = true;
                                Console.WriteLine($"✅ [OpenIddict] Successfully loaded production certificate from '{fileToLoad}'.");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"⚠️ [OpenIddict Certificate Warning] Could not load production certificate '{fileToLoad}': {ex.Message}. Falling back to development certificates.");
                        }
                    }
                }

                // 3. Fallback to development certificates if neither is provided
                if (!loaded)
                {
                    serverBuilder.AddDevelopmentEncryptionCertificate();
                    serverBuilder.AddDevelopmentSigningCertificate();
                }
            }
            else
            {
                serverBuilder.AddDevelopmentEncryptionCertificate();
                serverBuilder.AddDevelopmentSigningCertificate();
            }
        });
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var hostingEnvironment = context.Services.GetHostingEnvironment();
        var configuration = context.Services.GetConfiguration();
        
        context.Services.AddTransient<PermissionClaimsPrincipalContributor>();

        ConfigureCors(context);
        ConfigureAuthentication(context);
        ConfigureUrls(configuration);
        ConfigureBundles();
        ConfigureVirtualFileSystem(hostingEnvironment);
        ConfigureNavigationServices();
        ConfigureAutoApiControllers();
        ConfigureSwaggerServices(context.Services);
        ConfigureHealthChecks(context);
        Configure<RazorPagesOptions>(options =>

        {
            // Require login in all page
            options.Conventions.AuthorizeFolder("/");

            // Anonymous page
            options.Conventions.AllowAnonymousToPage("/auth/login");
            options.Conventions.AllowAnonymousToPage("/Account/Register");
            options.Conventions.AllowAnonymousToPage("/Account/ForgotPassword");
            options.Conventions.AllowAnonymousToPage("/AccessDenied");
        });

        context.Services.ConfigureApplicationCookie(options =>
        {
            options.LoginPath = "/auth/login";
            options.LogoutPath = "/Account/Logout";
            options.AccessDeniedPath = "/access-denied";
            options.Events.OnRedirectToLogin = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                }
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                }
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            };
        });

        context.Services.AddMapperlyObjectMapper<IdentityWebModule>();
    }

    private void ConfigureCors(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        context.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                var origins = configuration["App:CorsOrigins"]?
                    .Split(",", StringSplitOptions.RemoveEmptyEntries)
                    .Select(o => o.RemovePostFix("/"))
                    .ToArray() ?? Array.Empty<string>();

                if (origins.Length > 0)
                {
                    builder.WithOrigins(origins)
                           .SetIsOriginAllowedToAllowWildcardSubdomains();
                }
                else
                {
                    builder.SetIsOriginAllowed(_ => true);
                }

                builder
                    .WithAbpExposedHeaders()
                    .SetIsOriginAllowed(_ => true)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });
    }

    private void ConfigureAuthentication(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        context.Services.ForwardIdentityAuthenticationForBearer(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
        context.Services.Configure<AbpClaimsPrincipalFactoryOptions>(options =>
        {
            options.IsDynamicClaimsEnabled = true;
            options.Contributors.Add(
                typeof(PermissionClaimsPrincipalContributor)
            );
        });

        // context.Services.AddAuthentication()
        //     .AddGoogle(options =>
        //     {
        //         options.ClientId = configuration["Authentication:Google:ClientId"];
        //         options.ClientSecret = configuration["Authentication:Google:ClientSecret"];
        //         options.CallbackPath = "/signin-google";
        //         options.Scope.Add("profile");
        //         options.Scope.Add("email");
        //         options.SaveTokens = true;
        //     });
    }

    private void ConfigureUrls(IConfiguration configuration)
    {
        Configure<AppUrlOptions>(options =>
        {
            options.Applications["MVC"].RootUrl = configuration["App:SelfUrl"];
        });

        
        Configure<AbpMvcLibsOptions>(options =>
        {
            options.CheckLibs = false;
        });

        Configure<AbpClockOptions>(options =>
        {
            options.Kind = DateTimeKind.Utc;
        });
    }

    private void ConfigureBundles()
    {
        Configure<AbpBundlingOptions>(options =>
        {
            options.StyleBundles.Configure(
                LeptonXLiteThemeBundles.Styles.Global,
                bundle =>
                {
                    bundle.AddFiles("/global-styles.css");
                }
            );
        });
    }

    private void ConfigureVirtualFileSystem(IWebHostEnvironment hostingEnvironment)
    {
        if (hostingEnvironment.IsDevelopment())
        {
            Configure<AbpVirtualFileSystemOptions>(options =>
            {
                options.FileSets.ReplaceEmbeddedByPhysical<IdentityDomainSharedModule>(Path.Combine(hostingEnvironment.ContentRootPath, $"..{Path.DirectorySeparatorChar}QuickBite.Identity.Domain.Shared"));
                options.FileSets.ReplaceEmbeddedByPhysical<IdentityDomainModule>(Path.Combine(hostingEnvironment.ContentRootPath, $"..{Path.DirectorySeparatorChar}QuickBite.Identity.Domain"));
                options.FileSets.ReplaceEmbeddedByPhysical<IdentityApplicationContractsModule>(Path.Combine(hostingEnvironment.ContentRootPath, $"..{Path.DirectorySeparatorChar}QuickBite.Identity.Application.Contracts"));
                options.FileSets.ReplaceEmbeddedByPhysical<IdentityApplicationModule>(Path.Combine(hostingEnvironment.ContentRootPath, $"..{Path.DirectorySeparatorChar}QuickBite.Identity.Application"));
                options.FileSets.ReplaceEmbeddedByPhysical<IdentityWebModule>(hostingEnvironment.ContentRootPath);
            });
        }
    }

    private void ConfigureNavigationServices()
    {
        Configure<AbpNavigationOptions>(options =>
        {
            options.MenuContributors.Add(new IdentityMenuContributor());
        });
    }

    private void ConfigureAutoApiControllers()
    {
        Configure<AbpAspNetCoreMvcOptions>(options =>
        {
            options.ConventionalControllers.Create(typeof(IdentityApplicationModule).Assembly);
        });
    }

    private void ConfigureSwaggerServices(IServiceCollection services)
    {
        services.AddAbpSwaggerGen(
            options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo { Title = "Identity API", Version = "v1" });
                options.DocInclusionPredicate((docName, description) => true);
                options.CustomSchemaIds(type => type.FullName);
            }
        );
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
            app.UseWhen(
                context => !context.Request.Path.StartsWithSegments("/api"),
                appBuilder => appBuilder.UseErrorPage()
            );
        }

        app.UseForwardedHeaders(new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions
        {
            ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
        });

        app.UseCorrelationId();
        app.UseMiddleware<DatabaseUnavailableMiddleware>();
        app.MapAbpStaticAssets();
        app.UseRouting();
        app.UseCors();
        app.UseAuthentication();
        app.UseAbpOpenIddictValidation();

        if (MultiTenancyConsts.IsEnabled)
        {
            // app.UseMultiTenancy();
        }

        app.UseUnitOfWork();
        app.UseDynamicClaims();
        app.UseAuthorization();

        app.UseSwagger();
        app.UseAbpSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "Identity API");
        });

        app.UseHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = WriteHealthResponse
        });
        app.UseHealthChecks("/api/health", new HealthCheckOptions
        {
            ResponseWriter = WriteHealthResponse
        });

        app.UseAuditing();
        app.UseAbpSerilogEnrichers();
        app.UseConfiguredEndpoints();
    }

    private void ConfigureHealthChecks(ServiceConfigurationContext context)
    {
        context.Services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database")
            .AddCheck<SystemResourceHealthCheck>("system_resources");
    }

    private static async Task WriteHealthResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            total_duration_ms = Math.Round(report.TotalDuration.TotalMilliseconds, 2),
            timestamp = DateTime.UtcNow,
            entries = report.Entries.ToDictionary(
                entry => entry.Key,
                entry => new
                {
                    status = entry.Value.Status.ToString(),
                    description = entry.Value.Description,
                    data = entry.Value.Data.Count > 0 ? entry.Value.Data : null,
                    duration_ms = Math.Round(entry.Value.Duration.TotalMilliseconds, 2),
                    exception = entry.Value.Exception?.Message
                })
        };

        context.Response.StatusCode = report.Status == HealthStatus.Unhealthy
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status200OK;

        await context.Response.WriteAsJsonAsync(response);
    }
}

