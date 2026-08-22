using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using JetBrains.Annotations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using OpenIddict.Abstractions;
using Volo.Abp;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.OpenIddict.Applications;
using Volo.Abp.OpenIddict.Scopes;
using Volo.Abp.PermissionManagement;
using Volo.Abp.Uow;

namespace QuickBite.Identity.OpenIddict;

/* Creates initial data that is needed to property run the application
 * and make client-to-server communication possible.
 */
public class OpenIddictDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IConfiguration _configuration;
    private readonly IOpenIddictApplicationRepository _openIddictApplicationRepository;
    private readonly IAbpApplicationManager _applicationManager;
    private readonly IOpenIddictScopeRepository _openIddictScopeRepository;
    private readonly IOpenIddictScopeManager _scopeManager;
    private readonly IPermissionDataSeeder _permissionDataSeeder;
    private readonly IStringLocalizer<OpenIddictResponse> L;

    public OpenIddictDataSeedContributor(
        IConfiguration configuration,
        IOpenIddictApplicationRepository openIddictApplicationRepository,
        IAbpApplicationManager applicationManager,
        IOpenIddictScopeRepository openIddictScopeRepository,
        IOpenIddictScopeManager scopeManager,
        IPermissionDataSeeder permissionDataSeeder,
        IStringLocalizer<OpenIddictResponse> l )
    {
        _configuration = configuration;
        _openIddictApplicationRepository = openIddictApplicationRepository;
        _applicationManager = applicationManager;
        _openIddictScopeRepository = openIddictScopeRepository;
        _scopeManager = scopeManager;
        _permissionDataSeeder = permissionDataSeeder;
        L = l;
    }

    [UnitOfWork]
    public virtual async Task SeedAsync(DataSeedContext context)
    {
        await CreateScopesAsync();
        await CreateApplicationsAsync();
    }

    private async Task CreateScopesAsync()
    {
        if (await _openIddictScopeRepository.FindByNameAsync("Identity") == null)
        {
            await _scopeManager.CreateAsync(new OpenIddictScopeDescriptor {
                Name = "Identity", DisplayName = "Identity API", Resources = { "Identity" }
            });
        }
    }

    private async Task CreateApplicationsAsync()
    {
        var commonScopes = new List<string> {
            OpenIddictConstants.Permissions.Scopes.Address,
            OpenIddictConstants.Permissions.Scopes.Email,
            OpenIddictConstants.Permissions.Scopes.Phone,
            OpenIddictConstants.Permissions.Scopes.Profile,
            OpenIddictConstants.Permissions.Scopes.Roles,
            "Identity",
            "offline_access"
        };

        var configurationSection = _configuration.GetSection("OpenIddict:Applications");

        //Web Client (Identity_Web)
        var webClientId = configurationSection["Identity_Web:ClientId"];
        if (!webClientId.IsNullOrWhiteSpace())
        {
            var webClientRootUrl = configurationSection["Identity_Web:RootUrl"]!.EnsureEndsWith('/');

            /* Identity_Web client is only needed if you created a tiered
             * solution. Otherwise, you can delete this client. */
            await CreateApplicationAsync(
                name: webClientId!,
                type: OpenIddictConstants.ClientTypes.Confidential,
                consentType: OpenIddictConstants.ConsentTypes.Implicit,
                displayName: "Web Application",
                secret: configurationSection["Identity_Web:ClientSecret"] ?? "1q2w3e*",
                grantTypes: new List<string> //Hybrid flow
                {
                    OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.Implicit, OpenIddictConstants.GrantTypes.RefreshToken
                },
                scopes: commonScopes,
                redirectUri: $"{webClientRootUrl}api/auth/callback/oidc,http://localhost:3002/api/auth/callback/oidc,http://localhost:3000/api/auth/callback/oidc,https://localhost:44391/signin-oidc,{webClientRootUrl}signin-oidc,https://quickbite-wnkc.onrender.com/api/auth/callback/oidc,https://quickbite-wnkc.onrender.com/signin-oidc,https://quickbitemanager.onrender.com/signin-oidc",
                clientUri: webClientRootUrl,
                postLogoutRedirectUri: $"{webClientRootUrl}signout-callback-oidc,http://localhost:3002/signout-callback-oidc,http://localhost:3000/signout-callback-oidc,https://quickbite-wnkc.onrender.com/signout-callback-oidc,https://quickbitemanager.onrender.com/signout-callback-oidc"
            );
        }

        // Customer Web Client (quickbite_web)
        await CreateApplicationAsync(
            name: "quickbite_web",
            type: OpenIddictConstants.ClientTypes.Confidential,
            consentType: OpenIddictConstants.ConsentTypes.Implicit,
            displayName: "QuickBite Customer Web Application",
            secret: "1q2w3e*",
            grantTypes: new List<string>
            {
                OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.Implicit, OpenIddictConstants.GrantTypes.Password, OpenIddictConstants.GrantTypes.RefreshToken
            },
            scopes: commonScopes,
            redirectUri: "http://localhost:3002/api/auth/callback/oidc,http://localhost:3000/api/auth/callback/oidc,http://localhost:3002/signin-oidc,http://localhost:3000/signin-oidc,https://quickbite-wnkc.onrender.com/api/auth/callback/oidc,https://quickbite-wnkc.onrender.com/signin-oidc",
            clientUri: "https://quickbite-wnkc.onrender.com",
            postLogoutRedirectUri: "http://localhost:3002/signout-callback-oidc,http://localhost:3000/signout-callback-oidc,https://quickbite-wnkc.onrender.com/signout-callback-oidc"
        );

        // Admin & Merchant Portal Client (QuickBite_Portal)
        await CreateApplicationAsync(
            name: "QuickBite_Portal",
            type: OpenIddictConstants.ClientTypes.Public,
            consentType: OpenIddictConstants.ConsentTypes.Implicit,
            displayName: "QuickBite Admin & Merchant Portal",
            secret: null,
            grantTypes: new List<string>
            {
                OpenIddictConstants.GrantTypes.Password,
                OpenIddictConstants.GrantTypes.RefreshToken,
                OpenIddictConstants.GrantTypes.AuthorizationCode
            },
            scopes: commonScopes,
            redirectUri: "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3002,https://quickbitemanager.onrender.com,https://quickbitemanager.onrender.com/signin-oidc",
            clientUri: "https://quickbitemanager.onrender.com",
            postLogoutRedirectUri: "http://localhost:5173/login,http://localhost:3000/login,https://quickbitemanager.onrender.com/login,https://quickbitemanager.onrender.com/signout-callback-oidc"
        );





        // Swagger Client
        var swaggerClientId = configurationSection["Identity_Swagger:ClientId"];
        if (!swaggerClientId.IsNullOrWhiteSpace())
        {
            var swaggerRootUrl = configurationSection["Identity_Swagger:RootUrl"]?.TrimEnd('/');

            await CreateApplicationAsync(
                name: swaggerClientId!,
                type: OpenIddictConstants.ClientTypes.Public,
                consentType: OpenIddictConstants.ConsentTypes.Implicit,
                displayName: "Swagger Application",
                secret: null,
                grantTypes: new List<string> { OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.Password },
                scopes: commonScopes,
                redirectUri: $"{swaggerRootUrl}/swagger/oauth2-redirect.html",
                clientUri: swaggerRootUrl
            );
        }
    }

    private async Task CreateApplicationAsync(
        [NotNull] string name,
        [NotNull] string type,
        [NotNull] string consentType,
        string displayName,
        string? secret,
        List<string> grantTypes,
        List<string> scopes,
        string? clientUri = null,
        string? redirectUri = null,
        string? postLogoutRedirectUri = null,
        List<string>? permissions = null)
    {
        if (!string.IsNullOrEmpty(secret) && string.Equals(type, OpenIddictConstants.ClientTypes.Public,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException(L["NoClientSecretCanBeSetForPublicApplications"]);
        }

        if (string.IsNullOrEmpty(secret) && string.Equals(type, OpenIddictConstants.ClientTypes.Confidential,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException(L["TheClientSecretIsRequiredForConfidentialApplications"]);
        }

        var client = await _openIddictApplicationRepository.FindByClientIdAsync(name);

        var application = new AbpApplicationDescriptor {
            ClientId = name,
            ClientType = type,
            ClientSecret = secret,
            ConsentType = consentType,
            DisplayName = displayName,
            ClientUri = clientUri,
        };

        Check.NotNullOrEmpty(grantTypes, nameof(grantTypes));
        Check.NotNullOrEmpty(scopes, nameof(scopes));

        if (new[] { OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.Implicit }.All(
                grantTypes.Contains))
        {
            application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.CodeIdToken);

            if (string.Equals(type, OpenIddictConstants.ClientTypes.Public, StringComparison.OrdinalIgnoreCase))
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.CodeIdTokenToken);
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.CodeToken);
            }
        }

        if (!redirectUri.IsNullOrWhiteSpace() || !postLogoutRedirectUri.IsNullOrWhiteSpace())
        {
            application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.EndSession);
        }

        var buildInGrantTypes = new[] {
            OpenIddictConstants.GrantTypes.Implicit, OpenIddictConstants.GrantTypes.Password,
            OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.ClientCredentials,
            OpenIddictConstants.GrantTypes.DeviceCode, OpenIddictConstants.GrantTypes.RefreshToken
        };

        foreach (var grantType in grantTypes)
        {
            if (grantType == OpenIddictConstants.GrantTypes.AuthorizationCode)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode);
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.Code);
            }

            if (grantType == OpenIddictConstants.GrantTypes.AuthorizationCode ||
                grantType == OpenIddictConstants.GrantTypes.Implicit)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Authorization);
            }

            if (grantType == OpenIddictConstants.GrantTypes.AuthorizationCode ||
                grantType == OpenIddictConstants.GrantTypes.ClientCredentials ||
                grantType == OpenIddictConstants.GrantTypes.Password ||
                grantType == OpenIddictConstants.GrantTypes.RefreshToken ||
                grantType == OpenIddictConstants.GrantTypes.DeviceCode)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Token);
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Revocation);
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Introspection);
            }

            if (grantType == OpenIddictConstants.GrantTypes.ClientCredentials)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.ClientCredentials);
            }

            if (grantType == OpenIddictConstants.GrantTypes.Implicit)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.Implicit);
            }

            if (grantType == OpenIddictConstants.GrantTypes.Password)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.Password);
            }

            if (grantType == OpenIddictConstants.GrantTypes.RefreshToken)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.RefreshToken);
            }

            if (grantType == OpenIddictConstants.GrantTypes.DeviceCode)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.DeviceCode);
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.DeviceAuthorization);
            }

            if (grantType == OpenIddictConstants.GrantTypes.Implicit)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.IdToken);
                if (string.Equals(type, OpenIddictConstants.ClientTypes.Public, StringComparison.OrdinalIgnoreCase))
                {
                    application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.IdTokenToken);
                    application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.Token);
                }
            }

            if (!buildInGrantTypes.Contains(grantType))
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Prefixes.GrantType + grantType);
            }
        }

        var buildInScopes = new[] {
            OpenIddictConstants.Permissions.Scopes.Address, OpenIddictConstants.Permissions.Scopes.Email,
            OpenIddictConstants.Permissions.Scopes.Phone, OpenIddictConstants.Permissions.Scopes.Profile,
            OpenIddictConstants.Permissions.Scopes.Roles
        };

        foreach (var scope in scopes)
        {
            if (buildInScopes.Contains(scope))
            {
                application.Permissions.Add(scope);
            }
            else
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Prefixes.Scope + scope);
            }
        }

        if (redirectUri != null)
        {
            var uris = redirectUri.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var rUri in uris)
            {
                if (!rUri.IsNullOrWhiteSpace())
                {
                    if (Uri.TryCreate(rUri.Trim(), UriKind.Absolute, out var uri) && uri.IsWellFormedOriginalString())
                    {
                        if (application.RedirectUris.All(x => x != uri))
                        {
                            application.RedirectUris.Add(uri);
                        }
                    }
                }
            }
        }

        if (postLogoutRedirectUri != null)
        {
            var uris = postLogoutRedirectUri.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var pUri in uris)
            {
                if (!pUri.IsNullOrWhiteSpace())
                {
                    if (Uri.TryCreate(pUri.Trim(), UriKind.Absolute, out var uri) && uri.IsWellFormedOriginalString())
                    {
                        if (application.PostLogoutRedirectUris.All(x => x != uri))
                        {
                            application.PostLogoutRedirectUris.Add(uri);
                        }
                    }
                }
            }
        }

        if (permissions != null)
        {
            await _permissionDataSeeder.SeedAsync(
                ClientPermissionValueProvider.ProviderName,
                name,
                permissions,
                null
            );
        }

        if (client == null)
        {
            await _applicationManager.CreateAsync(application);
            return;
        }

        if (!HasSameRedirectUris(client, application))
        {
            client.RedirectUris = JsonSerializer.Serialize(application.RedirectUris.Select(q => q.ToString().TrimEnd('/')));
            client.PostLogoutRedirectUris = JsonSerializer.Serialize(application.PostLogoutRedirectUris.Select(q => q.ToString().TrimEnd('/')));

            await _applicationManager.UpdateAsync(client.ToModel());
        }

        if (!HasSameScopes(client, application))
        {
            client.Permissions = JsonSerializer.Serialize(application.Permissions.Select(q => q.ToString()));
            await _applicationManager.UpdateAsync(client.ToModel());
        }
    }

    private bool HasSameRedirectUris(OpenIddictApplication existingClient, AbpApplicationDescriptor application)
    {
        return existingClient.RedirectUris == JsonSerializer.Serialize(application.RedirectUris.Select(q => q.ToString().TrimEnd('/')));
    }

    private bool HasSameScopes(OpenIddictApplication existingClient, AbpApplicationDescriptor application)
    {
        return existingClient.Permissions == JsonSerializer.Serialize(application.Permissions.Select(q => q.ToString().TrimEnd('/')));
    }
}
